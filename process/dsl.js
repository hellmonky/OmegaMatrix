/**
 * DSL分析模块
 *
 */
const basicUtils = require('../utils/basicUtils');
const fileUtils = require('../utils/fileUtils');
const global = require('../global');
const aliyun = require('../cloudFirm/aliyun');

class Dsl {

    constructor() {
        // 依赖的工具类
        this.bs = new basicUtils.BasicUtils();
        this.fs = new fileUtils.FileUtils();
        this.global = new global.Global();
        // 内部缓存的工作目录
        this.project = [];
        // 对外发布函数集合
        this.pbFuncs = [];
        // 引用基础函数集合
        this.ogFuncs = [];
        // 当前环境的通用设置
        this.config = {
            regionId: this.global.common.regionId,
            accessKeyId: this.global.common.accessKeyId,
            accessKeySecret: this.global.common.accessKeySecret,
            proxy: this.global.common.proxy
        };
    }


    /**
     * 检查当前工程中是否存在对应的函数引用，true表示存在，false表示不存在
     * @param array
     * @param namespace
     * @returns {boolean}
     */
    hasNamespace(array, namespace) {
        let result = [];
        for(let i=0;i<array.length;i++) {
            result.push(array[i].namespace);
        }
        if(result.includes(namespace)) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * 从当前数组中获取函数定义
     * @param namespace
     * @param array
     */
    getFunctionDefine(array, namespace) {
        let result = {};
        for(let i=0;i<array.length;i++) {
            if(array[i].namespace === namespace) {
               result = array[i].fileContent;
               break;
            }
        }
        return result;
    }

    /**
     * 从当前项目中获取指定 namespace 的函数定义
     * @param namespace
     */
    //getFunctionDefine(currentProject, namespace) {
    //    return this.bs.getEleByProperty(currentProject, "namespace", namespace);
    //}

    /**
     * 校验当前文件所在路径和文件定义的namespace内容是否匹配，如果不匹配不算在当前工程文件中
     * @param namespace
     * @param content
     * @returns {boolean}
     */
    check_location(namespace, description) {
        // 检查函数定义得到的namespace是否符合文件组织规范
        let defineNamespace = description.prouduct + "." +
            description.version+"." +
            description.functionName;
        if(namespace !== defineNamespace) {
            return false;
        } else {
            return true;
        }
    }


    /**
     * DSL定义的descriptin部分检查
     * 主要是函数参数定义的合法性检查，为了简化处理目前默认都合法
     * @param descriptin
     * @returns {boolean}
     */
    check_description(description) {
        // 必填项的空值检测：如果有任意一项为未定义，表示定义错误
        let prouduct = this.bs.isUndefined(description.prouduct);
        let version = this.bs.isUndefined(description.version);
        let functionName = this.bs.isUndefined(description.functionName);
        let output = this.bs.isUndefined(description.output);
        if(prouduct || version || functionName || output) {
            return false;
        } else {
            return true;
        }

        // TODO: 其他的有效性检查
    }

    /**
     * DSL定义的functions部分检查
     * @param currentProject
     * @param functions
     * @returns {boolean}
     */
    check_imports(currentProject, imports) {
        // 在当前工程中找到依赖的函数引用
        let existFunctions = [];
        // 在当前工程中无法找到依赖的函数引用
        let unfoundFunctions = [];
        // 遍历检查
        for(let i=0;i<imports.length;i++) {
            // 如果引入为函数，需要在当前工程中进行查找
            let type = imports[i].type;
            let namespace = imports[i].namespace;
            if(type === "function") {
                if(this.hasNamespace(currentProject, namespace)) {
                    existFunctions.push(imports[i]);
                } else {
                    unfoundFunctions.push(imports[i]);
                }
            }

            // TODO: 如果引入为工程包文件，需要依赖于当前的工程目录来检查
            if(type === "package") {
                return true;
            }
        }

        // 进行统计输出
        if(existFunctions.length === imports.length) {
            console.log("import function parse success");
            return true;
        }else {
            console.log("import function can not find:");
            for(let i=0;i<unfoundFunctions.length;i++) {
                console.log(unfoundFunctions[i].namespace);
            }
            return false;
        }
    }

    /**
     * DSL定义的chain部分检查
     * @param currentProject
     * @param chain
     * @returns {boolean}
     */
    check_chain(currentProject, chain) {
        if(chain != null && chain != undefined) {

            // （1）按照step排序
            let seqChain = chain.sort(this.bs.intCompare("step", "asc"));
            console.log(seqChain.toString());

            // （2）检查是否有重复设置的步骤，例如存在两个step2等
            if(this.bs.isArrayPropDuplicated(seqChain, "step")) {
                return false;
            }

            // （3）对整个调用链检查from:input和to:output的唯一性
            let isInputOnce = this.bs.onlyContainOne(seqChain, "src", "input");
            let isOutputOnce = this.bs.onlyContainOne(seqChain, "dst", "output");
            if(!isInputOnce || !isOutputOnce) {
                console.log("调用链入参和出参设置多个，请检查");
                return false;
            }

            // （4）然后检查自定义函数的输入参数和输出结果是否在step的开头和结尾
            let input = seqChain[0].src;
            let out = seqChain[seqChain.length-1].dst;
            if(input !== "input" || out !== "output") {
                console.log("调用链入参和出参设置错误，请检查");
                return false;
            }

            // （5）对每一个chain进行检查调用链依赖检查
            for (let i = 0; i < seqChain.length; i++) {
                let src = seqChain[i].src;
                let dst = seqChain[i].dst;

                // 如果当前输入参数不为input，并且找不到引用函数，表示引用出错
                if(src !== "input") {
                    let isFromExist = this.hasNamespace(currentProject, src);
                    if(!isFromExist) {
                        console.log("chain error: can not find from function definition");
                        return false;
                    }
                }
                // 如果当前输出参数不为output，并且找不到引用函数，表示引用出错
                if(dst !== "output") {
                    let isToExist = this.hasNamespace(currentProject, dst);
                    if(!isToExist) {
                        console.log("chain error: can not find to function definition");
                        return false;
                    }
                }
            }

            // （6）转移函数检查
            for(let i = 0; i < seqChain.length; i++) {
                let src = seqChain[i].src;
                let dst = seqChain[i].dst;
                let transform = seqChain[i].transform;

                // 一定要有转移函数的实现，哪怕只是传递也需要有
                if(transform == null || transform == undefined) {
                    return false;
                }

                // 对转移函数中的参数进行拆分
                let transIn = [];
                let tarnsOu = [];
                for(let i=0;i<transform.length;i++) {
                    transIn.push(transform[i]["in"]);
                    tarnsOu.push(transform[i]["ou"]);
                }
                // 默认参数检查是正确的
                let isFrontContains = true;
                let isEndContains = true;
                // 过滤input和output的参数检查：如果src不是input，dst不是output，才检查参数
                if(src !== "input") {
                    // 要求输入参数去除default和global开头的参数，都在源函数的返回参数中，保证参数的来源一致
                    let srcFunction = this.getFunctionDefine(currentProject, src);
                    let srcFuncOutParams = srcFunction.description.output;
                    let tmp1 = this.bs.removeEleByValue(transIn,"default");
                    let tmp2 = this.bs.removeEleByValue(tmp1,"global.*");
                    isFrontContains = this.bs.array_isContains(tmp2, this.bs.getEleByProperty(srcFuncOutParams, "name"));
                }
                if(dst !== "output") {
                    let dstFunction = this.getFunctionDefine(currentProject, dst);
                    let dstFuncInParams = dstFunction.description.input;
                    // TODO: 要求output的参数要和被调用函数入口的必填参数完全一致，这里简化为完全一致
                    let dstFuncInMustParams = this.bs.getEleByProperty(dstFuncInParams, "name");
                    isEndContains = this.bs.array_isEqual(tarnsOu, dstFuncInMustParams);
                }
                if(!isFrontContains || !isEndContains) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * 检查当前工程：不能只检查单个DSL文件，因为文件定义中已经存在对整体的依赖关系了
     * @param projectDir
     * @returns {Array}
     */
    check_project(projectDir) {
        // （1）载入当前指定路径的工程
        let buffer = this.fs.loadProject(projectDir);

        // （2）遍历工程文件，进行检查，最终获取合法的工程文件（存储在按照namespace作为键值的Map中）
        // 顺序扫描：一遍一遍的过，每一次从前面得到的结果集出发再做检查

        // 位置检查：单文件检查
        let stage1 = [];
        for(let i=0;i<buffer.length;i++) {
            let element = buffer[i];
            let description = element.fileContent.description;
            // 正向增加
            if(this.check_location(element.namespace, description)) {
                stage1.push(element);
            }
            // 反向删除（对空间的要求会降低，不会存在同时存在多份数据的情况）
            //if(!this.check_location(element.namespace, content)) {
            //    buffer = this.bs.arrayDelete(buffer, i);
            //}
        }

        // 函数定义检查：单文件检查
        let stage2 = [];
        for(let i=0;i<stage1.length;i++) {
            let element = stage1[i];
            let description = element.fileContent.description;
            if(this.check_description(description)) {
                stage2.push(element);
            }
        }

        // TODO: 引用和调用链同时存在检查：单文件检查


        // 函数依赖检查：范围检查
        let stage3 = [];
        for(let i=0;i<stage2.length;i++) {
            let element = stage2[i];
            let imports = element.fileContent.imports;
            // 如果不存在依赖，表示这个是原生函数
            if(this.bs.isUndefined(imports) || this.check_imports(stage2, imports)) {
                stage3.push(element);
            }
        }

        // 转移函数检查：范围检查
        let stage4 = [];
        for(let i=0;i<stage3.length;i++) {
            let element = stage3[i];
            let content = element.fileContent.chain;
            if(this.check_chain(stage3, content)) {
                stage4.push(element);
            }
        }

        // （3）进行函数依赖的回归检查：
        // 由于转移函数错误导致函数删除后，会破坏函数间的依赖关系，需要重新检查，确保所有的依赖都正常
        let stage5 = [];
        for(let i=0;i<stage4.length;i++) {
            let element = stage4[i];
            let imports = element.fileContent.imports;
            if(this.bs.isUndefined(imports) || this.check_imports(stage4, imports)) {
                stage5.push(element);
            }
        }

        // TODO: （4）函数依赖逻辑检查：
        // 对于函数间调用的依赖逻辑关系进行检查，确保不存在环形依赖等问题

        // 最终通过检查集合
        return stage5;
    }

    /**
     * 从当前工程中，得到要发布的函数
     * @returns {Array}
     */
    getPublicFunctions() {
        let result = [];
        for(let i=0;i<this.project.length;i++) {
            let ele = this.project[i].fileContent;
            if(this.bs.isObjHasPropty(ele, "imports")) {
                result.push(this.project[i]);
            }
        }
        return result;
    }

    /**
     * 从当前工程中，得到要原生函数
     * 原生函数的意思就是已经发布或者可以通过HTTP请求统一进行访问的函数
     * @returns {Array}
     */
    getOriginFunctions() {
        let result = [];
        for(let i=0;i<this.project.length;i++) {
            let ele = this.project[i].fileContent;
            if(!this.bs.isObjHasPropty(ele, "imports")) {
                result.push(this.project[i]);
            }
        }
        return result;
    }

    /**
     * 参数转换：对obj按照array中规定的逻辑进行转换，最后输出转换后的参数
     * @param obj       当前输入参数
     * @param ele       当前函数定义
     * @returns {{}}
     */
    transform(obj, ele) {
        // 最终输出的是一个对象：属性名为调用函数的参数名，属性值为前指定的输入值
        let result = {};
        let paramsMap = ele.transform;

        // 获取当前的住转换参数数组，然后对齐
        for(let i=0;i<paramsMap.length;i++) {
            let cin = paramsMap[i].in;
            let cou = paramsMap[i].ou;

            // 参数值引用处理：包含对默认参数和全局参数的引用

            // 如果当前输入的标记为default值，则被调用函数请求参数中设置的默认值
            if(cin == "default") {
                let callFunc = this.getFunctionDefine(this.ogFuncs, ele.dst);
                // 获取当前调用函数入口参数中对应名称的参数默认值
                let tmp = this.bs.getEleWithPropertyValue(callFunc.description.input, "name", cou);
                cin = tmp[0]["defaultValue"];
            }

            // 如果当前输入的标记为global开头，则从当前工程的系统环境中获取值
            if(cin.startsWith("global")) {
                // 去除开头的global.字符串，然后按照.分割，最终得到拼接后的定位
                let propName = cin.replace(/global./g,"");
                let positions = propName.split(".");
                let startup = this.global;
                for(let j=0;j<positions.length;j++) {
                    startup = startup[positions[j]];
                }
                cin = startup;
            }

            // 最后设置请求参数对象：属性表示请求参数名称，属性的值就是实际请求值
            result[cou] = cin;
        }

        return result;
    }


    /**
     * 执行原生调用，这里的原生调用是指基于当前已经纳入支持的调用
     * @param namespace         原生函数的namespace
     * @param requestParams     请求参数对象
     */
    async nativeCall(namespace, requestParams) {
        // 执行请求的返回结果
        let response = {};

        // 通过namespace获取当前的函数定义
        let func = this.getFunctionDefine(this.ogFuncs, namespace);
        let prouduct = func.description.prouduct;
        let httpMethod = func.description.httpMethod;
        let type = func.description.type;

        // TODO: 根据当前的函数声明，准备需要的初始化配置
        let endpoint = this.global[prouduct]["endpoint"];
        let version = func.description.version;
        this.config["endpoint"] = endpoint;
        this.config["apiVersion"] = version;
        // 根据当前函数声明，获取指定的调用client，然后传入配置初始化
        let callTypeArray = type.split(".");
        if(callTypeArray.length === 2) {
            console.log("函数定义中指定调用方式错误");
            return [];
        } else {
            // 引入指定的包，初始化实例
            let requireContent = require('../cloudFirm/'+callTypeArray[0]);
            let method = callTypeArray[1];
            let Entrance = new requireContent[method](this.config);
            // 执行调用，得到返回结果
            try {
                response = await new Promise(function(resolve, reject) {
                    let res = Entrance.caller(httpMethod, requestParams);
                    return resolve(res);
                });
            } catch (err) {
                // 这里捕捉到错误 `error`
                console.log(err);
            }
        }
        return response;
    }


    /**
     * 执行函数调用
     * @param ogFuncs       依赖的原生函数集合
     * @param pbFunc        要发布的函数定义
     * @param language      要生成的语言类型，可选 Java，JavaScript
     * @returns {boolean}
     */
    async call(pbFunc) {
        // 得到函数的分段信息
        let description = pbFunc.fileContent.description;
        let seqChain = pbFunc.fileContent.chain.sort(this.bs.intCompare("step", "asc"));


        // 初始化的请求和返回参数
        let requestParams = description.input;
        let responseParams = {};

        // 然后根据chain逐一调用依赖关系
        // TODO: 包含两个mock函数，transform表示当前请求参数的转换，call表示对原生函数的调用
        let currentReq = [];    // 当前步骤中的请求参数
        let currentRes = [];    // 当前步骤中的返回参数
        for(let i=0;i<seqChain.length;i++) {
            let ele = seqChain[i];
            // 从用户输入开始
            if(ele.src == "input") {
                // 用户输入需要根据transform做参数转换，然后直接调用dst中指定的函数
                currentReq = this.transform(requestParams, ele);
                // TODO: 这里需要对要指定调用的函数类型进行区分，默认是对云产品的接口调用
                currentRes = await this.nativeCall(ele.dst, currentReq);

                // TODO: 这里的日志对于调试作用巨大
                console.log(ele.dst);
                console.log(currentReq);
                console.log(currentRes);
            }
            // 到最终输出结束
            else if(ele.dst == "output") {
                responseParams = this.transform(currentRes, ele);
            }
            // 如果是中间的状态流转
            else {
                // 先用上一个流程最终返回的结果，根据transform定义转换，作为本次调用请求参数
                currentReq = this.transform(currentRes, ele);
                // 接着用指定函数的返回值调用dst指定的函数
                currentRes = await this.nativeCall(ele.dst, currentReq);

                // TODO: 这里的日志对于调试作用巨大
                console.log(ele.src);
                console.log(currentReq);
                console.log(currentRes);
            }
        }

        // TODO: 最后对输出参数的检查
        //check_output(description.output, responseParams);

        // TODO: 返回一个函数对象
        return function(){};
    }

    /**
     * 对指定的工程目录进行分析
     * @param projectDir
     * @returns {Promise<void>}
     */
    async process(projectDir) {
        // 得到经过验证的工程集合
        this.project = this.check_project(projectDir);

        // 从当前工程中，拆分要发布的函数集合和依赖的原生函数集合
        this.pbFuncs = this.getPublicFunctions();
        this.ogFuncs = this.getOriginFunctions();

        // 遍历要发布的函数集合，对每一个函数生成代码调用
        for(let i=0;i<this.pbFuncs.length;i++) {
            let result = await this.call(this.pbFuncs[i]);
            console.log(result);
        }
    }
}


/**
 * 导出类
 */
module.exports = {
    Dsl: Dsl
};


