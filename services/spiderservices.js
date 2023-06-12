import fs from 'fs';
import request from 'request';

const HtmlFilePath = './html';

export class Console {
    static PrintInfo = str => console.log("\x1b[36m%s\x1b[0m", str);
    static PrintWarn = str => console.log("\x1b[33m%s\x1b[0m", str);
    static PrintDanger = str => console.log("\x1b[31m%s\x1b[0m", str);
    static PrintSuccess = str => console.log("\x1b[32m%s\x1b[0m", str);
    static Bright = str => console.log("\x1b[1m%s\x1b[0m", str);
}

export class Parser {

    static init = (mainDir, logFile) => {
        this.mainDir = mainDir;
        this.logFile = logFile;
    }

    static Executer = (currUrl, tempTotal, currLvl) => {
        return new Promise(async (resolve, reject) => {
            try {
                const body = await this.SendGetReq(currUrl);
                const { filepath, urls } = await this.DownloadPage(body, tempTotal, currLvl);
                const info = this.LogText(tempTotal, currUrl, `SUCCESS (File ${filepath})`, currLvl);
                await this.LogUrl(info, this.logFile);
                return resolve({ urls: urls, filepath: filepath });
            }
            catch (e) {
                const info = this.LogText(tempTotal, currUrl, `DROPPED (Reason ${e.message})`, currLvl)
                await this.LogUrl(info, this.logFile);
                return reject(e);
            }
        });
    }

    static SendGetReq = async url => {
        return new Promise((resolve, reject) => {
            const options = { 'url': url, 'timeout': 5000 };
            request(options, (e, res, body) => {
                if (e)
                    return reject(e);

                const contentType = res.headers['content-type'];                
                if (contentType.includes('xml') || contentType.includes('html'))
                    return resolve(body);
                else
                    return reject({message: 'Not HTML or XML'});
            });
        });
    }

    static LogText = (tempTotal, url, status, currLvl) => {
        return `\n[${tempTotal}] [LEVEL: ${currLvl}]\nURL: ${url}\n[STATUS: ${status}]\n`;
    }

    static LogUrl = (urlInfo, filepath) => {
        return new Promise((resolve, reject) => {
            fs.appendFile(filepath, urlInfo, e => {
                if (e)
                    return reject(e);
                return resolve(true);
            });
        });
    }

    static DownloadPage = (body, currCol, currLvl) => {
        return new Promise(async (resolve, reject) => {
            try {
                const filepath = `${this.mainDir}/${currLvl}/${currCol}.html`;
                const urls = await this.SavePage(body, filepath, `${this.mainDir}/${currLvl}`);
                return resolve({ 'filepath': filepath, 'urls': urls });
            }
            catch (e) {
                return reject(e);
            }
        });
    }

    static SavePage = async (htmlStr, filename = `${HtmlFilePath}/${Date.now()}.html`, path) => {
        return new Promise(async (resolve, reject) => {
            try {
                if (await isDir(path) == false)
                    await makeDir(path);

                const writer = fs.createWriteStream(filename);
                writer.on('error', (e) => reject(e));
                writer.on('finish', () => resolve(urlsArr));

                let urlsArr = [];
                const urlRegEx = /((https|http)?:\/\/[^\s]+)/g;
                const lines = htmlStr.split('>');
                const len = lines.length-1;
                lines.forEach((line, i) => {
                    writer.write(line+=(i<len) ? '>' : '');
                    if (line.includes('<a')) {
                        const urls = line.match(urlRegEx);
                        if (urls && urls.length > 0)
                            urls.forEach(url => urlsArr.push(url.replaceAll(/'|"|\\n/g, '')));
                    }
                });

                writer.end();
            }
            catch (e) {
                console.log('Save Error: ', e);
                return reject(e);
            }
        });
    }
}

export const writeJson = async (filepath, jsonData) => {
    return new Promise((resolve, reject) => {
        fs.writeFile(filepath, JSON.stringify(jsonData), e => {
            if (e)
                return reject(e);
            return resolve(true);
        });
    });
}

export const isDir = (path) => {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(path))
            return resolve(true);
        return resolve(false);
    });
}

export const makeDir = (path) => {
    return new Promise((resolve, reject) => {
        fs.mkdir(path, { recursive: true }, e => {
            if (e)
                return reject(e);
            return resolve(true);
        });
    });
}

export const readJson = (path) => {
    return new Promise((resolve, reject) => {
        fs.readFile(path, 'utf8', (e, jsonData) => {
            if (e)
                return reject(e);
            return resolve(JSON.parse(jsonData));
        });
    });
}

export const deleteFile = (path) => {
    return new Promise((resolve, reject) => {
        fs.unlink(path, e => {
            if (e)
                return resolve(false);
            return resolve(true)
        });
    });
}

export const SendSessionEndReq = (url) => {
    return new Promise((resolve, reject) => {
        Console.PrintWarn('\nEND REQUEST SENT');
        request(url, (e, res, body) => {
            if (e)
                return reject(e);
            Console.PrintWarn('END REQUEST RESPONSE ENDED');
            return resolve(true);
        });   
    });
}