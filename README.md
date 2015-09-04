# getSubmissions2.0
App to get the source code of your submissions with verdict ```Accepted``` from Codeforces

## To install
```
$ npm install
```

## To use
```
$ node index.js -h <handle> -c <count> -d <directory>

<handle>: Valid handle from codeforces.com
<count>:  Searching for Accepted in the last N submissions, "infinite" by default
<directory>: The path for the directory where submissions will be saved, './' by default

Examples:
  - node index.js -h tourist       // Gets all Accepted submissions and saves it in './' (current directory)
  - node index.js -h tourist -c 20 // Gets all Accepted submissions from the last 20 submissions and saves it in './'
  - node index.js -h tourist -d codeforces // Gets all Accepted submissions and saves it in './codeforces' folder.
```

This could be take a while (depending of the amount of submissions).

## Directory structure after download
The structure of folders is something like:
```
<directory>
            /Codeforces Beta Round #1/
                                    A.cpp
            /Codeforces Beta Round #16 (Div. 2 Only)
                                                    /A.cpp
                                                    /B.cpp
                                                    /C.cpp
                                                    /D.cpp
            / ...
```
Complete example: [link](https://github.com/jhonber/Programming-Contest/tree/master/codeforces)

## Storage
*data.db*: File to storage downloaded submissions
