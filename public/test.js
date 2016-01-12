var http    = require('http'),
    url     = require('url'),
    path    = require('path'),
    fs      = require('fs'),

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
    mime    = require('./mime');

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

        res.setHeader('Content-Length', stat.size);
        res.setHeader('Content-Type', getMime(pathname));

        var stream = fs.createReadStream(pathname);
        // 管道
        stream.pipe(res);

        stream.on('error', function(err) {
            onError(res);
        });
    });

    function onError(res) {
        res.statusCode = 500;
        res.end('Internal server error\n');
    }
    
    function getMime(realPath) {
        var ext = path.extname(realPath);
        ext = ext ? ext.slice(1) : 'unknown';

        return mime[ext] || 'text/plain';
    }

}).listen(8888);