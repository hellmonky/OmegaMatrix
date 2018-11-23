/**
 *
 * client for aliyun OpenApi with ROA and RPC
 *
 * author: yuanlai.xwt
 * update: 2018-04-12
 *
 */
const Q = require('q');
const url = require('url');
const kitx = require('kitx');
const assert = require('assert');
const crypto = require('crypto');
const request = require('request');
const JSON = require('json-bigint');
const querystring = require('querystring');


/**
 * RPC 风格的 POP API 调用，适用于 metric 类的接口调用
 * 签名算法：
 * https://help.aliyun.com/document_detail/25492.html?spm=a2c4g.11174283.6.837.rdqN6j
 */
class RPCAPI {

    /**
     * 构造函数，用于初始化执行请求的基本参数
     * @param config 具体格式如下：
     {
          regionId: '',
          accessKeyId: '',
          accessKeySecret: '',
          endpoint: 'http://ecs.aliyun.com',
          apiVersion: '2015-09-01',
          proxy: 'http://xxx:zzz'
     }
     */
    constructor(config) {
        // checkout input config data
        assert(config, 'must pass "config"');
        assert(config.regionId, 'must pass "config.regionId"');
        assert(config.endpoint, 'must pass "config.endpoint"');
        assert(config.apiVersion, 'must pass "config.apiVersion"');
        assert(config.accessKeyId, 'must pass "config.accessKeyId"');
        assert(config.accessKeySecret, 'must pass "config.accessKeySecret"');

        // setup
        this.regionId = config.regionId;
        this.endpoint = config.endpoint;
        this.apiVersion = config.apiVersion;
        this.accessKeyId = config.accessKeyId;
        this.accessKeySecret = config.accessKeySecret;
        this.proxy = config.proxy;

        this.host = url.parse(this.endpoint).hostname;
        const httpModule = this.host.startsWith('https://') ? require('https') : require('http');
        this.keepAliveAgent = new httpModule.Agent({
            keepAlive: true,
            keepAliveMsecs: 3000,
        });
    }


    // 生成请求URL：
    gen_requestURL(region_id, access_id, access_key, api_version, endpoint, requestParamters) {
        const params = this.gen_commonParams(region_id, access_id, api_version);
        for (var i in requestParamters) {
            let value = requestParamters[i];
            if (typeof value !== 'string') {
                value = JSON.stringify(value);
            }
            params[i] = value;
        }
        params.Signature = this.gen_signature(access_key, params, 'GET');
        let url = '';
        for (var i in params) {
            url += '&' + this.percentEncode(i) + '=' + this.percentEncode(params[i]);
        }
        url = url.substring(1);

        return endpoint + '?' + url;
    }


    // 生成请求BODY：
    gen_requestBody(region_id, access_id, access_key, api_version, requestParamters) {
        const params = this.gen_commonParams(region_id, access_id, api_version);
        for (var i in requestParamters) {
            let value = requestParamters[i];
            if (typeof value !== 'string') {
                value = JSON.stringify(value);
            }
            params[i] = value;
        }
        params.Signature = this.gen_signature(access_key, params, 'POST');
        let fields_string = '';
        for (var i in params) {
            fields_string += '&' + this.percentEncode(i) + '=' + this.percentEncode(params[i]);
        }
        fields_string = fields_string.substring(1);
        return fields_string;
    }


    // 生成公共参数集：
    gen_commonParams(region_id, access_id, api_version) {
        const now = new Date();
        const nonce = now.getTime() + '' + parseInt((Math.random() * 1000000000));
        const params = {
            RegionId: region_id,
            AccessKeyId: access_id,
            Format: 'JSON',
            SignatureMethod: 'HMAC-SHA1',
            SignatureVersion: '1.0',
            SignatureNonce: nonce,
            Timestamp: now.toISOString(),
            Version: api_version,
        };
        return params;
    }


    // 签名算法
    gen_signature(access_key, params, method) {
        let keys = Object.keys(params);
        keys = keys.sort();
        let canonicalizedQueryString = '';
        for (let i = 0; i < keys.length; i++) {
            canonicalizedQueryString += '&' + this.percentEncode(keys[i]) + '=' + this.percentEncode(params[keys[i]]);
        }
        canonicalizedQueryString = this.percentEncode(canonicalizedQueryString.substring(1));
        const stringToSign = method + '&%2F&' + canonicalizedQueryString;
        const signature = crypto.createHmac('sha1', access_key + '&').update(stringToSign).digest()
            .toString('base64');
        return signature;
    }


    /**
     * URL特殊字符编码转义
     */
    percentEncode(str) {
        var str = encodeURIComponent(str);
        str = str.replace(/\*/g, '%20');
        str = str.replace(/\'/g, '%27');
        str = str.replace(/\(/g, '%28');
        str = str.replace(/\)/g, '%29');
        return str;
    }


    /**
     * 统一调用入口
     *
     * @param {*} iniconfigPath 配置文件，获取对应的endpoint，ak，sk，regionID，apiVersion等基本信息
     * @param {*} type          请求的方法，包含acs，alert和metrics这三种
     * @param {*} conditions    请求参数，包含对应的定制化请求参数
     * @param {*} method        HTTP请求类型，包含GET,POST,PUT,DELETE等，默认情况下都是GET
     */
    caller(method = 'GET', queryParamters, body = '', headers = {}, opts) {
        const defer = Q.defer();

        // 1 默认参数设置
        const reqOptions = {
            // todo: 从字符串转换为int
            // timeout: config.common.timeout,
            timeout: 12000,
            method: method,
        };

        // 2 直接传入请求参数结构，不再转换了
        const params = queryParamters;

        // 3 参数检查，生成最终的请求参数
        if (method.toUpperCase() == 'GET') {
            reqOptions.url = this.gen_requestURL(this.regionId, this.accessKeyId, this.accessKeySecret,
                this.apiVersion, this.endpoint, params);
        } else if (method.toUpperCase() == 'POST') {
            reqOptions.url = endpoint;
            reqOptions.body = this.gen_requestBody(this.regionId, this.accessKeyId, this.accessKeySecret,
                this.apiVersion, params);
            reqOptions.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
        }

        // 4 判断是否需要通过代理进行访问
        if (this.proxy) {
            reqOptions.proxy = this.proxy;
        }

        // 5 执行请求
        console.log(reqOptions)
        request(reqOptions, function(err, response) {
            if (err) {
                defer.reject(err);
            } else {
                try {
                    const result = JSON.parse(response.body);
                    defer.resolve(result);
                } catch (e) {
                    defer.reject(new Error('Request resutl failed: ' + response.body));
                }
            }
        });

        // 6 返回结果集
        return defer.promise;
    }
}


/**
 * ROA 风格的 POP API 调用，适用于 alert 类的接口调用
 * 签名算法：
 * https://help.aliyun.com/document_detail/26051.html?spm=a2c4g.11186623.6.973.zIMYhs
 */
class ROAAPI {
    /**
     * 构造函数，用于初始化执行请求的基本参数
     * @param config 具体格式如下：
     {
          accessKeyId: '',
          accessKeySecret: '',
          endpoint: 'http://ecs.aliyun.com',
          apiVersion: '2015-09-01',
          proxy: 'http://xxx:zzz'
     }
     */
    constructor(config) {

        assert(config, 'must pass "config"');
        assert(config.endpoint, 'must pass "config.endpoint"');
        assert(config.apiVersion, 'must pass "config.apiVersion"');
        assert(config.accessKeyId, 'must pass "config.accessKeyId"');
        assert(config.accessKeySecret, 'must pass "config.accessKeySecret"');

        this.endpoint = config.endpoint;
        this.apiVersion = config.apiVersion;
        this.accessKeyId = config.accessKeyId;
        this.accessKeySecret = config.accessKeySecret;
        this.proxy = config.proxy;


        this.host = url.parse(this.endpoint).hostname;
        const httpModule = this.host.startsWith('https://') ? require('https') : require('http');
        this.keepAliveAgent = new httpModule.Agent({
            keepAlive: true,
            keepAliveMsecs: 3000,
        });
    }


    /**
     * 默认Header生成
     */
    buildHeaders() {
        const now = new Date();
        return {
            accept: 'application/json',
            date: now.toGMTString(),
            host: this.host,
            'x-acs-signature-nonce': kitx.makeNonce(),
            'x-acs-signature-method': 'HMAC-SHA1',
            'x-acs-signature-version': '1.0',
            'x-acs-version': this.apiVersion,
            'x-sdk-client': `Node.js(${process.version})`,
        };
    }

    /**
     * 加密Header生成
     */
    getCanonicalizedHeaders(headers) {
        const prefix = 'x-acs-';
        const keys = Object.keys(headers);
        const canonicalizedKeys = [];
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (key.startsWith(prefix)) {
                canonicalizedKeys.push(key);
            }
        }

        canonicalizedKeys.sort();

        let result = '';
        for (let i = 0; i < canonicalizedKeys.length; i++) {
            const key = canonicalizedKeys[i];
            result += `${key}:${this.filter(headers[key]).trim()}\n`;
        }

        return result;
    }

    /**
     * 请求路径排序
     */
    getCanonicalizedResource(uriPattern, query) {
        const keys = Object.keys(query).sort();

        if (keys.length === 0) {
            return uriPattern;
        }

        const result = [];
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            result.push(`${key}=${query[key]}`);
        }

        return `${uriPattern}?${result.join('&')}`;
    }

    /**
     * 签名字符串准备
     */
    buildStringToSign(method, uriPattern, headers, paramters) {
        const accept = headers.accept;
        const contentMD5 = headers['content-md5'] || '';
        const contentType = headers['content-type'] || '';
        const date = headers.date || '';
        // 中间数据缓存
        const header = `${method}\n${accept}\n${contentMD5}\n${contentType}\n${date}\n`;
        // 添加 CanonicalizedHeaders 和 CanonicalizedResource
        const canonicalizedHeaders = this.getCanonicalizedHeaders(headers);
        const canonicalizedResource = this.getCanonicalizedResource(uriPattern, paramters);

        return `${header}${canonicalizedHeaders}${canonicalizedResource}`;
    }

    /**
     * 字符串签名
     */
    signature(stringToSign) {
        const utf8Buff = Buffer.from(stringToSign, 'utf8');
        return kitx.sha1(utf8Buff, this.accessKeySecret, 'base64');
    }

    /**
     * 构造授权字符串
     */
    buildAuthorization(stringToSign) {
        return `acs ${this.accessKeyId}:${this.signature(stringToSign)}`;
    }

    // 格式清理
    filter(value) {
        return value.replace(/[\t\n\r\f]/g, ' ');
    }

    /**
     * 统一调用入口
     * @param method        HTTP请求方式，包含GET,POST,DELETE和PUT
     * @param uriPattern    HTTP请求的基础路径
     * @param paramters     HTTP请求中的路径参数，表示为一个对象{}
     * @param body          对于POST请求的Body参数传递
     * @param headers       自定义header添加
     * @param opts          自定义HTTP请求的optins添加
     * @return {ThenPromise<any> | * | ThenPromise<*> | PromiseLike<any> | Promise<any>}
     */
    caller(method = 'GET', uriPattern, queryParamters, body = '', headers = {}, opts) {
        const defer = Q.defer();

        // 1 URL生成
        let url = `${this.endpoint}/${uriPattern}`;
        if (Object.keys(queryParamters).length) {
            url += `?${querystring.stringify(queryParamters)}`;
        }

        // 2 默认header生成：默认header和自定义header生成
        const mixHeaders = Object.assign(this.buildHeaders(), headers);


        // 3 body生成
        let postBody = null;
        if (body) {
            postBody = Buffer.from(body, 'utf8');
            mixHeaders['content-md5'] = kitx.md5(postBody, 'base64');
            mixHeaders['content-length'] = postBody.length;
        }

        // 4 header中的签名生成
        const stringToSign = this.buildStringToSign(method, uriPattern, mixHeaders, queryParamters);
        mixHeaders.authorization = this.buildAuthorization(stringToSign);

        // 5 设置请求参数
        const reqOptions = {
            timeout: 12000,
            method: method,
            url: url,
            data: postBody,
            headers: mixHeaders,
        };

        // 6 代理设置
        if (this.proxy) {
            reqOptions.proxy = this.proxy;
        }

        // 7 执行请求
        request(reqOptions, function(err, response) {
            if (err) {
                defer.reject(err);
            } else {
                try {
                    const result = JSON.parse(response.body);
                    defer.resolve(result);
                } catch (e) {
                    defer.reject(new Error('Request resutl failed: ' + response.body));
                }
            }
        });

        // 8 返回promise
        return defer.promise;
    }
}


/**
 * 导出类
 */
module.exports = {
    RPCAPI: RPCAPI,
    ROAAPI: ROAAPI,
};
