/**
 * endpoint
 */
const path = require('path');
const dslAnalysis = require('./process/dsl');
const dsl = new dslAnalysis.Dsl();

// 测试工程：当前目录下的project文件夹
const projectDir = __dirname + path.sep +"project";
dsl.process(projectDir).then(function (result) {
    console.log(result);
});

