import * as path from "path";
import * as net from "net";
import * as fs from "fs";
import MarkdownIt from "markdown-it";

const MIME_TYPES = {
    "jpg" : "image/jpg",
    "jpeg" : "image/jpeg",
    "png" : "image/png",
    "html" : "text/html",
    "css" : "text/css",
    "txt" : "text/plain"
};

/**
 * returns the extension of a file name (for example, foo.md returns md)
 * @param fileName (String)
 * @return extension (String)
 */
function getExtension(fileName) {
    const formatPath = path.extname(fileName).toLowerCase();
    if (formatPath.startsWith(".")) {
        return formatPath.substring(1);
    }
    return formatPath;
}

/**
 * determines the type of file from a file's extension (for example,
 * foo.html returns text/html
 * @param: fileName (String)
 * @return: MIME type (String), undefined for unkwown MIME types
 */
function getMIMEType(fileName) {
    const ext = path.extname(fileName);
    return ext.length > 0 ? MIME_TYPES[ext.substring(1)] : null;
}

class Request {
    constructor(reqStr) {
        const [method, path] = reqStr.split(" ");
        this.method = method;
        this.path = path;
    }
}

class Response {

    static STATUS_CODES = {
        200 : "OK",
        308 : "Permanent Redirect",
        404 : "Page Not Found",
        500 : "Internal Server Error"
    };

    constructor(socket, statusCode = 200, version = "HTTP/1.1") {
        this.sock = socket;
        this.statusCode = statusCode;
        this.version = version;
        this.headers = {};
        this.body = null;
    }

    setHeader(name, value) {
        this.headers[name] = value;
    }

    status(statusCode) {
        this.statusCode = statusCode;
        return this;
    }

    send(body) {
        this.body = body ?? "";
      
        if (!Object.hasOwn(this.headers, "Content-Type")) {
            this.headers["Content-Type"] = "text/html";
        }

        const statusCodeDesc = Response.STATUS_CODES[this.statusCode];

        const headersString = Object.entries(this.headers).reduce((s, [name, value]) => {
            return s + `${name}: ${value} \r\n`;
        }, "");

        this.sock.write(`${this.version} ${this.statusCode} ${statusCodeDesc}\r\n`);
        this.sock.write(`${headersString}\r\n`);
        this.sock.write(this.body);

        this.sock.end();
    }

    redirect(loc){
        this.status(308);
        this.setHeader('Location', loc);
        this.send();
    }

    restricted(loc){
        this.status(404)
        this.setHeader('Location', loc);
        this.send("You are trying to access forbidden directory! Not cool")
    }
}

class HTTPServer {
    constructor(rootDirFull, redirectMap) {
        this.rootDirFull = rootDirFull;
        this.redirectMap = redirectMap;
        this.server = net.createServer(this.handleConnection.bind(this));
    }

    listen(port, host) {
        this.server.listen(port, host);
    }

    handleConnection(sock) {
        sock.on("data", data => this.handleRequest(sock, data));
    }

    redirectOrRestricted(path, res){
        if (this.redirectMap[path]){
            res.redirect(this.redirectMap[path]);
            return;
        }

        if(path.includes('..')){
            res.restricted(path)
            return;
        }
    }

    handleFileRequest(reqPathFull, res){
        fs.readFile(reqPathFull, (err, data) => {
            if(err){
                res.status(500).send("Server Error");
            }
            if(data){
                res.status(200).send(data);
            }
        })
    }

    handleRequest(sock, binaryData) {
        const req = new Request(binaryData.toString());
        const res = new Response(sock);
        const reqPathFull = path.join(this.rootDirFull, req.path);

        this.redirectOrRestricted(req.path, res);
        
        fs.access(reqPathFull, fs.constants.F_OK, (err) => {
            if (err) {
                res.status(404).send("404: File Not Found");
                return;
            }
    
            fs.stat(reqPathFull, (statErr, stats) => {
                if (statErr) {
                    // Error accessing stats of the file/directory, send a 404
                    res.status(500).send("Server Error");
                    return;
                }
    
                if (stats.isDirectory()) {
                    this.handleDirectoryRequest(reqPathFull, res);
                } else if (stats.isFile()) {
                    this.handleFileRequest(reqPathFull, res);
                } else {
                    res.status(404).send("404: File Not Found");
                }
            });
        });
        
        // TODO: (see homework specification for details)
        // 0. implementation can start here, but other classes / methods can be modified or added
        // 1. handle redirects first
        // 2. if not a redirect and file/dir does not exist send back not found
        // 3. if file, serve file
        // 4. if dir, generate page that lists files and dirs contained in dir
        // 5. if markdown, compile and send back html
    }
}


export {
    Request,
    Response,
    HTTPServer
};