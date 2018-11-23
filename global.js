/**
 *
 * 全局变量处理模块
 *
 */
const path = require('path');
const basicUtils = require('./utils/basicUtils');
const fileUtils = require('./utils/fileUtils');


 class Global {
     constructor() {
         let sysDefine = process.env.RUNTIME;
         this.bs = new basicUtils.BasicUtils();
         this.fs = new fileUtils.FileUtils();
         // 获取当前工作目录所在位置中，config目录下，config.xxx.yml的文件，xxx和当前运行时匹配
         let configFile = __dirname + path.sep + "config" + path.sep + "config."+sysDefine+".yml";
         console.log(configFile);
         this.content = this.fs.load(configFile);
         return this.content;
     }

     /**
      * 从当前全局变量中获取指定key的值
      * @param key
      */
     get(key) {
        if(this.bs.isObjHasPropty(this.content, key)) {
            return this.content[key];
        }
     }

 }


/**
 * 导出类
 */
module.exports = {
    Global: Global
};

