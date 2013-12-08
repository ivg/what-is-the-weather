what-is-the-weather
===================

Here lies a simple site that grants any user access to a weather forecasting
service. The site can be accessed from Internet at

   http://what-is-the-weather.net

Why yet another weather forecaster? Well, my project is not about a weather
forecasting, but about user interfaces. I've tried to make a program that has
a very human like interface. All interactions (except map) are done in the form
of a dialog. Is it bad or good? Give it a try!


INSTALLING
==========

The program is implemented using only client-side languages and, in general,
doesn't require any server or configuration. All libraries are included in
the package. In one sentence: unzip the archive to whatever place you like.


RUNNING
=======

Since it is a simple html with some javascript on board, it sufficient just to
direct your browser to the index.html, located at the top directory of the
project. But... for some, unknown to me reason, Chrome, Safari (and possibly other
Webkit based browser) denies an access to the geolocation API from local files.
So, to get a full experience from the application, you can run the site from a
local HTTP server. The easiest way to start a server is:

1. follow to the root of the project

2. start a http server using python:

    $ python -m SimpleHTTPServer

3. direct your browser to http://localhost:8000


USAGE
=====

The main idea of my application was to make a program with a very user friendly
interface. So this section is required to be empty.
