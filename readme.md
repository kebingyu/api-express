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

* A GET to /v1/user/[:id] : Retrieve user info by user id. Access token required.
* A POST to /v1/user : Register a new user.
* A PUT to /v1/user/[:id] : Update user info by user id. Access token required.

### Login/out

* A POST to /login : User log in. Receive an access token. 
* A POST to /logout : User log out. Access token required.

### Blog

* A GET to /v1/blog/[:id] : Retrieve blog info by blog id. Access token required.
* A GET to /v1/blog/ : Retrieve all blogs for given user id. Access token required.
* A POST to /v1/blog : Create a new blog. Access token required.
* A PUT to /v1/blog/[:id] : Update blog info by blog id. Access token required.
* A DELETE to /v1/blog/[:id] : Delete blog by blog id. Access token required.

### Tag

* A POST to /v1/tag : Create a new tag. Access token required.
* A DELETE to /v1/tag/[:id] : Delete tag by tag id. Access token required.
