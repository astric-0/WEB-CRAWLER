import express from 'express';
import yargs from 'yargs';

import { Spider } from './controller/spider.js';
const app = express();
const PORT = 3000;
/*
process.on("SIGINT", () => {
    Spidy.ProcessSummary(true);
    process.exit();
});
*/
app.get('/start_session/', (req, res) => {
    const sid = Date.now();
    console.log(sid);
    new Spider({ sid: sid });
    res.json({ 'sessionId': sid });
});

app.get('/end_session/:sid', (req, res) => {
    const { sid } = req.params;
    console.log('SESSION END REQUEST RECEIVED: ', sid);
    res.json({ 'sessionId': sid });
});

app.listen(PORT, (err) => {
    if (err)
        console.log(err);

    const time = `${new Date().getHours()}:${new Date().getMinutes()}`;
    console.log(`\nLISTENING @ ${PORT}\nSTARTED @ ${time}`);
});