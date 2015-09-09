## A simple RESTful blog api 

* Built on top of Express.js
* Use MongoDB as the database and use [monk](https://github.com/Automattic/monk) as a thin API layer with promise support
* Also comes with a simple validator

## Install

* Clone the git and run `npm install`. Might need to install Xcode if you are on OS X.
* To start the server, run `npm start`.
* Go to Mongo shell and run `use simple_blog` to create the database.

## API

### User

* A POST to /v1/user : Register a new user.

### Login/out

* A POST to /login : User log in. Receive an access token. 
* A POST to /logout : User log out. Access token required.
