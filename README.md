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
  // Gets all Accepted submissions and saves it in './' (current directory)
  - node index.js -h tourist
  
  // Gets all Accepted submissions from the last 20 submissions and saves it in './'
  - node index.js -h tourist -c 20
  
  // Gets all Accepted submissions and saves it in './codeforces' folder.
  - node index.js -h tourist -d codeforces
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

Example of code downloaded: (In the head of file is added a link for the problem) [C.cpp](https://github.com/jhonber/Programming-Contest/blob/master/codeforces/Codeforces%20Round%20%23318%20%5BRussianCodeCup%20Thanks-Round%5D%20%28Div.%202%29/C.cpp)

## Storage
**data.db**: File to storage downloaded submissions

## How to add support for a new language
In ```index.js``` there are two variables **extension** and **comment**, to add new language is necessary to add the extension of language and line for comment.

**Example**: how to add **Ada** language

Add in the final the pair key value for extension and comment respectively.
```Javascript
var extension = {'GNU C++': 'cpp', 'GNU C': 'c' ,'Java': 'java', 'Haskell': 'hs',
  'Pascal':'p', 'Perl': 'pl', 'PHP': 'php', 'Python': 'py', 'JavaScript': 'js', 'Ada': 'adb'};

var comment = {'GNU C++': '//','GNU C': '//' ,'Java': '//', 'Haskell': '--',
  'Pascal': '//', 'Perl': '#', 'PHP': '//', 'Python': '#', 'JavaScript': '//', 'Ada': '--'};
```
