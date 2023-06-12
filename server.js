import express from 'express';
import yargs from 'yargs';

import { Spider } from './controller/spider.js';
const app = express();
const PORT = 3000;

app.listen(PORT, (err) => {
    if (err)
        console.log(err);

    const time = `${new Date().getHours()}:${new Date().getMinutes()}`;
    console.log(`\nLISTENING @ ${PORT}\nSTARTED @ ${time}`);    
    
    const Spidy = new Spider(yargs(process.argv.slice(2)).argv);
    process.on("SIGINT", () => {
        Spidy.ProcessSummary(true);
        process.exit();
    });
});