/**
 *
 * 基础工具模块
 *
 */

class BasicUtils {

    constructor() {

    }

    /**
     * 判断当前输入是否为合法数字
     * @param obj
     * @returns {boolean}
     */
    isNumber(obj) {
        // js默认的数字检查
        let defaultNumber = isNaN(obj);
        // 字符串表示大数字检查
        let bigNumber = true;

        // 最终的到是否为数字
        if(defaultNumber || bigNumber) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * 判断一个对象是否为未定义状态：undefined或者null状态
     * @param obj
     * @returns {boolean}   如果是未定义返回true，如果是一个对象为false
     */
    isUndefined(obj) {
        if(obj == null || obj == undefined) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * array元素删除，from从0开始计数
     * jquery 之父 John Resig 给出的方法：
     *
     Array.prototype.remove = function(from, to) {
        var rest = this.slice((to || from) + 1 || this.length);
        this.length = from < 0 ? this.length + from : from;
        return this.push.apply(this, rest);
     }
     *
     * @param from
     * @param to
     * @returns {*}
     */
    arrayDelete(array, from, to) {
        return array.slice((to || from) + 1 || array.length);
    };

    /**
     * int类型比较函数定义，用于数组 sort 函数的输入函数
     * @param property  要求属性的类型是int，可以做减法操作
     * @param sequence  升序还是降序
     * @returns {Function}
     */
    intCompare(property, sequence) {
        return function(obj1,obj2){
            let value1 = obj1[property];
            let value2 = obj2[property];
            // 按照降序排列
            if(sequence == "desc") {
                return  value2 - value1;
            } else if(sequence == "asc") {
                return value1 - value2;
            }
        }
    }

    /**
     * 遍历当前数组，获取包含指定属性的元素，构造新的数组返回
     * @param array
     * @param property
     * @returns {Array}
     */
    getEleByProperty(array, property) {
        let result = [];
        for(let i=0;i<array.length;i++) {
            if(array[i][property]) {
                result.push(array[i][property]);
            }
        }
        return result;
    }

    /**
     * 遍历当前数组，获取包含指定属性的值等于传入参数的元素，构造新的数组返回
     * @param array
     * @param property
     * @param value
     * @returns {Array}
     */
    getEleWithPropertyValue(array, property, value) {
        let result = [];
        let reg = new RegExp(value);
        for(let i=0;i<array.length;i++) {
            if(reg.test(array[i][property])) {
                result.push(array[i]);
            }
        }
        return result;
    }

    /**
     * 遍历当前数组，去除包含指定属性的元素，构造新的数组返回
     * @param array
     * @param property
     */
    removeEleByProperty(array, property) {
        let result = [];
        for(let i=0;i<array.length;i++) {
            if(!array[i][property]) {
                result.push(array[i][property]);
            }
        }
        return result;
    }

    /**
     * 遍历当前数组，去除包含指定属性的值等于传入参数的元素，构造新的数组返回
     * @param array
     * @param property
     * @param value     支持正则过滤
     */
    removeEleWithPropertyValue(array, property, value) {
        let result = [];
        let reg = new RegExp(value);
        for(let i=0;i<array.length;i++) {
            if(!reg.test(array[i][property])) {
                result.push(array[i]);
            }
        }
        return result;
    }

    /**
     * 遍历当前数组，去除和传入值相同的元素，构造新的数组返回
     * @param array
     * @param value     如果value是字符串，支持正则
     * @returns {Array}
     */
    removeEleByValue(array, value) {
        let result = [];
        for(let i=0;i<array.length;i++) {
            // 如果当前传入的value是字符串，并且元素也是字符串，支持正则
            let tmp1 = (typeof value=="string");
            let tmp2 = (typeof array[i]=="string");
            if(tmp1 && tmp2) {
                let reg = new RegExp(value);
                if(!reg.test(array[i])) {
                    result.push(array[i]);
                }
            } else {
                if(array[i]!==value) {
                    result.push(array[i]);
                }
            }
        }
        return result;
    }

    /**
     * 在当前数组中查找指定属性为指定的值，是否在整个数组中唯一
     * @param array
     * @param property
     * @param value
     * @returns {boolean}
     */
    onlyContainOne(array, property, value) {
        let result = this.getEleWithPropertyValue(array, property, value).length;
        if(result > 1 || result == 0) {
            return false;
        } else {
            return true;
        }
    }

    /**
     * 在当前数组中查找指定属性为指定的值，是否在整个数组中唯一
     * 不占用内存空间，只做引数统计
     * @param array
     * @param property
     * @param value
     * @returns {boolean}
     */
    onlyContainOneLite(array, property, value) {
        // 笨办法，遍历计数，超过1就退出
        let count = 0;
        for(let i=0;i<array.length;i++) {
            if(array[i][property] == value) {
                count++;
            }
        }
        // 不出现，或者出现多于一次都不正确
        if(count > 1 || count == 0) {
            return false;
        } else {
            return true;
        }
    }

    /**
     * 判断当前对象是否包含指定属性的内容
     * @param obj
     * @param property
     */
    isObjHasPropty(obj, property) {
        return obj.hasOwnProperty(property);
    }

    /**
     * 判断数组中所有元素按照给定属性是否重复：使用双层嵌套循环来做这个事情
     * @param array
     * @param property
     * @returns {boolean}
     */
    isArrayPropDuplicated(array, property) {
        let len = array.length;
        for (let i = 0; i < len; i++) {
            let count = 0;
            for (let j = 0;j < len; j++) {
                if (array[i][property] === array[j][property]) {
                    count++;
                }
            }
            // 如果当前找到属性重复就退出
            if (count > 1) {
                console.log('array ele has dumplated property: '+array[i][property]);
                return true;
            }
        }
        // 两次遍历都没有因为找到重复退出，表示无重复属性
        return false;
    }

    /**
     * 集合求并集
     * @param src
     * @param dst
     * @returns {any[]}
     */
    array_Union(src, dst) {
        let aSet = new Set(src);
        let bSet = new Set(dst);
        return Array.from(new Set(aSet.concat(bSet)));
    }

    /**
     * 集合求交集
     * @param src
     * @param dst
     * @returns {any[]}
     */
    array_Intersection(src, dst) {
        let aSet = new Set(src);
        let bSet = new Set(dst);
        return Array.from(new Set(aSet.filter(v => bSet.has(v))));
    }

    /**
     * 两个数组求差集
     * @param src
     * @param dst
     * @returns {T[]}
     */
    array_Difference(src, dst) {
        let aSet = new Set(src);
        let bSet = new Set(dst);
        return Array.from(new Set(src.concat(dst).filter(v => !aSet.has(v) || !bSet.has(v))));
    }

    /**
     * 数组子集判断
     * 比较arr1的所有元素是否都在arr2中被包含，如果包含返回true，不包含false
     * @param arr1
     * @param arr2
     * @returns {boolean}
     */
    array_isContains(arr1, arr2) {
        for (let i=0; i<arr1.length; i++) {
            if(!arr2.includes(arr1[i])){
                return false;
            }
        }
        return true;
    }

    /**
     * 数组完全相等判断
     * @param arr1
     * @param arr2
     * @returns {boolean}
     */
    array_isEqual(arr1, arr2) {
        if(this.array_Difference(arr1,arr2).length === 0) {
            return true;
        } else {
            return false;
        }
    }

}



/**
 * 导出类
 */
module.exports = {
    BasicUtils: BasicUtils
};
