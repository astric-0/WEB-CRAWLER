# WEB-CRAWLER

# PLEASE INSTALL REQUIRED PACKAGES
npm i express yargs fs request

# TO RUN WITH ARGS:
-d : Main directory name [ to store html file level wise ] <br/>
-u : Seed Url. <br/>
-l : Url's Log file name [ will be found as Maindir/logfile ]
-L : Link Limit [ total number of unique links to process = UNIQUE_LINKS(DROPPED + DOWNLOADED) ] <br/>
-M : Milli Seconds. <br/>
-C : Total Requests to send in given Milli Seconds. <br/>
-R : Resume Dir. <br/>

# EXAMPLES
To Crawl With given url
> node server.js -d MainDirName -u www.example.com

To Set Milli Seconds and Request Count.
> node server.js -d MainDirName -u www.example.com -M 10000 -C 6
this sets the crawler to send 6 requests in 10000 milliseconds (= 10 seconds)

To Resume 
> node server.js -R MainDirName
# NOTE: 
1. to resume the .config file must exist in the named directory.
2. When resuming args like (-u, -l, -d) are ignored and only args (-L, -C, -M) can be processed

# TO RUN WITH DEFAULT SETTINGS
cmd: node server.js
> Default Seed Url (-u) : www.github.com <br/>
> Default Milliseconds (-M) : 10000 <br/>
> Default Request Count (-C) : 6 <br/>
> Default Main Directory name (-d) : date_timestamp (example : 6-12-2023_10:34:21_AM) <br/>
> Default Url Log Filename (-l) : Url.log (example : 6-12-2023_10:34:21_AM/Url.log) <br/>
