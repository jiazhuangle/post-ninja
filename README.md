# post-ninja


## Introduction
基于puppeteer，进行web接口录制和回放。
js文件介绍：
    record.js:录制接口  
    playback.js:回放接口  
    package.json:模块信息描述文件
    common.js:基础方法  
    recordconfig.js:录制配置文件  
    playbackconfig.js:回放配置文件  


## User manual
     
    （1）用户打开项目后，通过package.json把所需的依赖全部安装在本地环境中（命令：npm install）。
    （2）通过修改MongDBConfig.js配置本地MongoDB数据库url（默认'mongodb://root:root@localhost:27017/），
         同时创建db:'puppeteer',coverage_collection:'coverage',
                interface_collection:'interface',
	            interfaceExec_collection:'interfaceExec',
	            demo_collection:'demo'
    （3）修改RecordConfig.js的URL来指定默认打开浏览器的网址（默认url:'http://localhost:8080/xxx/login'）。
       (4)修改PlaybackConfig.js的配置信息（host）。
    （5）运行Record.js（命令：node Record.js）来进行浏览器录制。
    （6）录制记录保存在本地MongoDB数据库中。
       (7)打开Playback.js进行回放。
## Deployment
    
    环境要求：
    （1）下载代码https://github.com/jiazhuangle/post-ninja
    （2）安装node.js  10.15及以上版本
    （3）安装npm  6.9.0及以上版本
    （4）安装MongoDB  建议3.2.7及以上版本
    
    项目运行：
    （1）cd post-ninja-master
    （2）npm install
     (3) node Record.js
    （4）node Playback.js
## About us

航天信息测试开发团队主要致力研发于各类测试软件的研发，并为其相应的项目进行专业的设计与开发。
    contributor: ![daoxiaonoodles](https://github.com/daoxiaonoodles)
    contributor: ![jiazhuangle](https://github.com/jiazhuangle)
