/**
 *
 * 文件处理模块
 *
 */
const path = require('path');
const fs = require('fs-extra');
const yaml = require('js-yaml');


class FileUtils {

    constructor() {

    }

    /**
     * 载入文件
     * @param filePath
     * @returns {boolean}
     */
    load(filePath) {
        let config = this.readFile(filePath);
        return config;
    }

    /**
     * 检查文件是否存在
     * @param filePath
     * @returns {boolean}
     */
    checkFilePath(filePath) {
        try {
            fs.ensureFileSync(filePath);
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }

    /**
     * 遍历指定的文件夹，获取所有文件完整路径到列表中
     * @param dir
     * @returns {Array}
     */
    walkDir(dir) {
        let results = [];
        let files = fs.readdirSync(dir);
        for (const file of files) {
            let filePath = dir + path.sep + file;
            let fileStat = fs.statSync(filePath);

            if (fileStat && fileStat.isDirectory()) {
                let fileList = this.walkDir(filePath);
                results = results.concat(fileList);
            } else {
                results.push(filePath);
            }
        }
        return results;
    }

    /**
     * 读入指定路径的DSL文件
     * @param filePath
     * @returns {boolean}
     */
    readFile(filePath) {
        let object = {};
        if(this.checkFilePath(filePath)) {
            try {
                object = yaml.safeLoad(fs.readFileSync(filePath, 'utf8'));
            } catch (e) {
                // log当前错误
                console.log(e);
                // 然后抛出自定义错误，用于辅助定位问题
                throw new Error('read file error: ' + filePath);
            }
        }
        return object;
    }

    /**
     * 获取文件的namespace：将文件当前路径去除所在的根路径，然后转换为.分割的字符串
     * @param dir
     * @param filePath
     * @returns {Promise<string>}
     */
    getFileNameSpace(dir, filePath) {
        // 去除根路径
        let removeDir = filePath.replace(dir+path.sep, '');
        // 去除文件后缀名
        let removeSubfix = removeDir.replace(".func", '');
        // 转换路径分割符为.
        let result = removeSubfix.replace(new RegExp('\\' + path.sep, 'g'), '.');
        return result;
    }

    /**
     * 获取指定工程路径下的所有文件
     * @param dir
     * @returns {Array}
     */
    loadProject(dir) {
        let result = [];
        let fileList = this.walkDir(dir);
        for(let i=0;i< fileList.length; i++) {
            try {
                let fileContent = this.readFile(fileList[i]);
                // 获取当前路径下的文件和内容
                let node = {
                    namespace: this.getFileNameSpace(dir, fileList[i]),
                    filePath: fileList[i],
                    fileContent: fileContent
                };
                result.push(node);
            } catch (e) {
                console.log(e);
            }
        }
        return result;
    }

    /**
     * 写入yaml文件到指定路径的文件中
     * @param filePath
     * @param content
     * @returns {Promise<boolean>}
     */
    async writeFile(filePath, content) {
        if(this.checkFilePath(filePath)) {
            try {
                fs.outputFileSync(filePath, content);
                return true;
            } catch (e) {
                console.log(e);
                return false;
            }
        }
    }
}


/**
 * 导出类
 */
module.exports = {
    FileUtils: FileUtils
};
