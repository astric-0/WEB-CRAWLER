import {
    Console, Parser, writeJson, readJson, deleteFile, SendSessionEndReq
} from "../services/spiderservices.js";
import { mkdir } from "fs/promises";
import fs from 'fs';

export class Spider {
    constructor(args) {
        this.defaultUrl = 'https://github.com';
        this.configFile = '';
        this.LinkLimit = 5;
        this.IntervalLimit = 6;
        this.TimeLimit = 10000;

        this.currLvl = 0;
        this.currCol = 0;
        this.dropped = 0;
        this.Proccessed = {};
        this.pendingRes = 0;
        this.finished = false;
        this.urlId = 0;

        this.resume = false;
        this.resumeDir = null;
        this.sid = 0;

        if (args === undefined)
            args = {};

        this.ProcessArgs(args);
        if (this.resume)
            this.ResumeState(this.resumeDir);
        else {
            if (!fs.existsSync(this.mainDir)) {
                fs.mkdirSync(this.mainDir + '/0', { recursive: true });
                this.PrintInitValues();
                Console.PrintDanger('STARTING IN 2.5 secs...');
                setTimeout(() => this.Crawl(), 2500);
            }
            else
                Console.PrintDanger('PLEASE RENAME: DIR conflict');
        }
    }

    Crawl = async () => {
        Parser.init(this.mainDir, this.urlLogsFile);
        const intervalTimeGap = this.TimeLimit / this.IntervalLimit;

        const sender = setInterval(async () => {
            this.urlId++;

            const tempTotal = this.urlId;
            const currLvl = String(this.currLvl), currCol = String(this.currCol);
            let currUrl = this.DeUrlQueue();
            try {
                if (currUrl !== undefined && currUrl.length > 0) {
                    currUrl += `?sid=${this.sid}`;

                    this.AddUrlPending(currUrl, tempTotal);
                    this.PrintBasic();
                    Console.Bright(`[${tempTotal}] REQUEST->${currUrl}`);

                    if (!this.IsVisited(currUrl)) {
                        this.currCol++;
                        this.SaveState(tempTotal);

                        const { urls, filepath } = await Parser.Executer(currUrl, tempTotal, currLvl);
                        this.EnUrlQue(urls);
                        this.AddVisited(currUrl, tempTotal);

                        Console.PrintSuccess(`SUCCESS [D:${currLvl}|I:${currCol}]`);
                        Console.PrintWarn(`file: ${filepath}`);
                        this.DePendingRes();
                    }
                    else
                        Console.PrintWarn('ALREADY PROCCESSED');
                }
                if (this.IsCurrLvlEmpty() && !this.IsResPending())
                    this.LevelUp(), this.currCol = 0;
            }
            catch (e) {
                //console.log('Error: ', e);
                Console.PrintDanger(e.message);
                this.AddDropped(currUrl, tempTotal);
                this.DePendingRes();

                Console.PrintDanger(`DROPPED [D:${currLvl}|I:${currCol}]`);
            }

            if (this.IsResPending() && this.InLimit())
                Console.PrintWarn(`\nResponse Pending[${this.pendingRes}]`);
            else if (!this.InLimit() || this.IsLevelNull()) {
                clearInterval(sender);
                this.ProcessSummary();
                SendSessionEndReq('http://localhost:3000/end_session/' + this.sid);
            }
        }, intervalTimeGap);
    }

    SaveState = async (urlId) => {
        try {
            const info = {
                'urlQueue': this.urlQueue,
                'Proccessed': this.Proccessed,
                'currLvl': this.currLvl,
                'urlId': urlId,
                'mainDir': this.mainDir,
                'urlLogsFile': this.urlLogsFile,
                'IntervalLimit': this.IntervalLimit,
                'LinkLimit': this.LinkLimit,
                'TimeLimit': this.TimeLimit
            };
            await writeJson(this.configFile, info);
        }
        catch (e) {
            console.log(e);
        }
    }

    ResumeState = async (dir) => {
        try {
            const {
                urlQueue, Proccessed, currLvl, urlId, IntervalLimit,
                mainDir, urlLogsFile, LinkLimit, TimeLimit
            } = await readJson(dir + '/config.json');

            const { L, C, M } = this.others;

            this.urlQueue = urlQueue;
            this.Proccessed = Proccessed;
            this.currLvl = currLvl;
            this.urlId = urlId;
            this.mainDir = mainDir;
            this.urlLogsFile = urlLogsFile;

            this.LinkLimit = (L !== undefined) ? this.TotalProcessed() + L : LinkLimit;
            this.IntervalLimit = (C !== undefined) ? C : IntervalLimit;
            this.TimeLimit = (M !== undefined) ? M : TimeLimit;

            this.configFile = `${this.mainDir}/config.json`;

            const pendingUrls = this.CalculateProccessed();
            if (pendingUrls.length > 0)
                this.urlQueue[this.currLvl] = [...pendingUrls, ...this.urlQueue[this.currLvl]];

            this.PrintInitValues();
            this.Crawl();
        }
        catch (e) {
            throw e;
        }
    }

    CalculateProccessed = () => {
        let pendingUrls = [], lastId;
        Object.keys(this.Proccessed).forEach(async key => {
            const { status, urlId } = this.Proccessed[key];
            if (status == 'Pending') {

                delete this.Proccessed[key];
                pendingUrls.push(key);

                const file = `${this.mainDir}/${this.currLvl}/${urlId}.html`;
                await deleteFile(file);
                const msgStr = `\n[try] REMOVED : ${file} [Reason: status could be pending]\nURL : ${key}\n`;

                Parser.LogUrl(msgStr, this.urlLogsFile);
                Console.PrintDanger(msgStr);
            }
            else if (status == false)
                this.dropped++;
            lastId = urlId;
        });

        this.urlId = lastId + 1;
        this.pendingRes = 0;
        return pendingUrls;
    }

    ProcessSummary = (interrupt = false) => {
        if (this.finished)
            return;
        this.finished = true;
        Console.Bright('\nALL UNIQUE LINKS PROCESSED [true:SUCCESS, false:DROPPED]')
        console.log(this.Proccessed);

        if (interrupt)
            Console.PrintWarn('\nINTERRUPT OCCURED');
        if (!this.InLimit())
            Console.PrintWarn('\nMAX URL LIMIT REACHED');
        else if (this.IsCurrLvlEmpty())
            Console.PrintWarn('\nURL QUEUE EMPTY');

        let total = this.TotalProcessed();
        let info = `\n[URL(s) PROCESSED: ${total}]`;
        info += `\n[FILES DOWNLOADED: ${total - this.dropped - this.pendingRes}]`;
        info += `\n[URL(s) DROPPED: ${this.dropped}]`;
        info += `\n[RESPONSE PENDING: ${this.pendingRes}]`;

        Console.PrintInfo(info);
        //LogUrl(info, this.urlLogsFile);
    }

    IncPendingRes = () => this.pendingRes++;

    DePendingRes = () => {
        if (this.pendingRes > 0)
            this.pendingRes--;
    }

    IsResPending = () => {
        return this.pendingRes > 0;
    }

    ProcessArgs = (args) => {
        /*
        u: url,    d: main dir,   l: logfile name
        M: milli seconds,  C: interval count, L: Link Limit, R: Resume
        */
        const { u, l, d, M, C, L, R, sid } = undefined || args;

        if (sid !== undefined)
            this.sid = sid;

        if (R !== undefined) {
            this.resume = true;
            this.others = { L, C, M };
            this.resumeDir = R;
            return;
        }

        if (u !== undefined) {
            let url = u;
            if (!u.startsWith('http'))
                url = 'https://' + u;
            this.defaultUrl = url;
        }
        this.urlQueue = [[this.defaultUrl]];

        if (L !== undefined)
            this.LinkLimit = L;

        if (d !== undefined)
            this.mainDir = d;
        else
            this.mainDir = './' + new Date().toLocaleString().replaceAll('/', '-').replaceAll(',', '').replaceAll(' ', '_');
        this.configFile = `${this.mainDir}/config.json`;

        if (l !== undefined)
            this.urlLogsFile = `${this.mainDir}/${l}`;
        else
            this.urlLogsFile = `${this.mainDir}/Url.log`;

        if (C !== undefined)
            this.IntervalLimit = C;

        if (M !== undefined)
            this.timeLimit = M;
    }

    PrintInitValues = () => {
        console.log('\n********************');
        Console.PrintDanger(`SESSION ID: ${this.sid}`);
        Console.PrintInfo(`MAIN DIR: ${this.mainDir}`);
        Console.PrintInfo(`LOGS FILE: ${this.urlLogsFile}`);
        Console.PrintWarn(`LIMIT: ${this.LinkLimit}`);
        Console.Bright(`SEED URL: ${this.defaultUrl}`);
        Console.Bright(`INITIAL URL ID: ${this.urlId}`);
        Console.PrintDanger(`INTERVAL LIMIT: ${this.IntervalLimit}`);
        Console.PrintDanger(`TIME LIMIT: ${this.TimeLimit}`);
        console.log('********************\n');
    }

    MakeDir = async (dir) => {
        return new Promise(async (resolve, reject) => {
            try {
                if (!fs.existsSync(dir)) {
                    await mkdir(dir);
                    resolve(true);
                }
                else
                    resolve(false);
            }
            catch (e) {
                resolve(false);
            }
        });
    }

    AddUrlPending = (url, urlId) => {
        if (this.Proccessed[[url]] === undefined) {
            this.Proccessed[[url]] = { status: 'Pending', urlId: urlId };
            this.IncPendingRes();
        }
    }

    PrintBasic = () => {
        const total = this.TotalProcessed();
        Console.PrintInfo(`\nDept:${this.currLvl}|Index:${this.currCol} (Pending ${this.urlQueue[this.currLvl].length},Limit:${this.LinkLimit}) P:${total}|D:${this.dropped}|S:${total - this.dropped - this.pendingRes}|W:${this.pendingRes}`);
    }

    DeUrlQueue = () => {
        if (this.urlQueue[this.currLvl] !== undefined)
            return this.urlQueue[this.currLvl].shift();
        return undefined;
    }

    LevelUp = async () => {
        this.currLvl++;
        if (this.urlQueue[this.currLvl])
            return await this.MakeDir(`${this.mainDir}/${this.currLvl}`);
    }

    NextLevel = () => this.currLvl + 1;

    EnUrlQue = (urls) => {
        if (this.urlQueue[this.NextLevel()] === undefined)
            this.urlQueue[this.NextLevel()] = [];
        this.urlQueue[this.NextLevel()] = [...this.urlQueue[this.NextLevel()], ...urls];
    }

    IsCurrLvlEmpty = () => {
        if (this.urlQueue[this.currLvl] === undefined || this.urlQueue[this.currLvl].length == 0)
            return true;
        return false;
    }

    InLimit = () => {
        return this.LinkLimit == -1 || this.TotalProcessed() < this.LinkLimit;
    }

    IsLevelNull = () => {
        const lvl = this.urlQueue[this.currLvl]
        return (lvl === null || lvl === undefined);
    }

    AddDropped = (url, urlId) => {
        this.dropped++;
        this.Proccessed[[url]] = { "status": false, "urlId": urlId };
    }

    AddVisited = (url, urlId) => {
        this.Proccessed[[url]] = { "status": true, "urlId": urlId };
    }

    IsVisited = (url) => {
        return this.Proccessed[[url]] !== undefined && this.Proccessed[[url]].status != 'Pending';
    }

    TotalProcessed = () => {
        return Object.keys(this.Proccessed).length;
    }
}