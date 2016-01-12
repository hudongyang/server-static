var http    = require('http'),
    url     = require('url'),
    path    = require('path'),
    fs      = require('fs'),
    zlib    = require('zlib'),

    root    = __dirname,

    /**
     * 静态文件存放的目录，该目录职位的文件不让访问
     * @type {String}
     */
    static  = 'public',

    /**
     * mime类型
     * @type {json}
     */
    mime    = require('./mime'),
    config  = require('./config');

http.createServer(function(req, res) {
    
    var pathname = url.parse(req.url).pathname;

    pathname = path.join(root, static, pathname);

    fs.stat(pathname, function(err, stat) {
        if(err) {
            if('ENOENT' == err.code) {
                res.statusCode = 404;
                return res.end('not found\n');
            }

            return onError(res);
        }

        var ext = getExt(pathname),
            patten = new RegExp(config.fileMatch),
            compress = new RegExp(config.compress);

        // res.setHeader('Content-Length', stat.size);
        res.setHeader('Content-Type', getMime(ext));

        if(patten.test(ext)) {
            setExpires(res);
            setLastModified(res, stat);
            if(set304(req, res, stat)) return;
        }

        // 管道
        var stream = fs.createReadStream(pathname);

        if(compress.test(ext)) {
            setGzip(req, res, stream);
        } else {
            stream.pipe(res);    
        }

        stream.on('error', function(err) {
            onError(res);
        });
    });
}).listen(8888);

function setGzip(req, res, stream) {
    var acceptEncoding = req.headers['accept-encoding'] || '';
    if(acceptEncoding.match(/\bgzip\b/)) {
        res.setHeader('Content-Encoding', 'gzip');
        stream.pipe(zlib.createGzip()).pipe(res);
    } else if(acceptEncoding.match(/\bdeflate\b/)) {
        res.setHeader('Content-Encoding', 'deflate');
        stream.pipe(zlib.createDeflate()).pipe(res);
    }
}

/**
 * 设置过期时间
 * @param {string} pathname 文件路径
 */
function setExpires(res) {
   
    // 如果是config中制定的文件，设置浏览器缓存该文件的过期时间
    var expires = new Date();
    expires.setTime(expires.getTime() + config.maxAge * 1000);

    res.setHeader('Expires', expires.toUTCString());
    res.setHeader('Cache-Control', 'max-age=' + config.maxAge);
}

/**
 * 如果请求头中的if-modified-since的值和文件的最后修改时间相同，设置304状态码
 */
function set304(req, res, stat) {
    var ifModifiedSince = req.headers['if-modified-since'];
    
    if(!ifModifiedSince) return false;

    if(ifModifiedSince == stat.mtime.toUTCString()) {
        res.statusCode = 304;
        res.end()

        return true;
    }

    return false;
}

/**
 * 设置最后修改时间
 * @param {[type]} stat 文件状态
 */
function setLastModified(res, stat) {
    res.setHeader('Last-Modified', stat.mtime.toUTCString());
}

function onError(res) {
    res.statusCode = 500;
    res.end('Internal server error\n');
}

function getMime(ext) {
    return mime[ext] || 'text/plain';
}

function getExt(realPath) {
    var ext = path.extname(realPath);
    return ext ? ext.slice(1) : 'unknown';
}