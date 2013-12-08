// -*- js2-basic-offset: 2 -*-
/*global jQuery, Weather */

(function($) {
  var dialogs = {
    "request-weather" : {
      enter : requestWeather,
      options : [
        { text : "Ok. I'll wait"},
        { text : "So? Use the force!", jump: "request-weather"},
        { text : "No, I do not want to know a weather for this location",
          jump : "select-location"},
        { text : "I already know the weather for that time.",
          jump : "select-forecast"
        }
      ]
    },
    
    "weather-report" : {
      enter : renderWeather,
      options : [
        { text: "Ok. Thanks."},
        { text : "Fine, but I need a forecast for another time",
          jump : "select-forecast"
        },
        { text : "Good, please, give me a weather for another place",
          jump : "select-location"
        }
      ]
    },
    
    "select-location" : {
      enter : renderMap,
      leave : finishMap,
      options : [
        {text : "Ok. Here I am!", checked : false, jump : "request-weather"}
      ]
    },
    
    "select-forecast" : {
      enter : "For what date, time or place would like to know the weather?",
      options : [
        { text : "I'd like to know the weather for today",
          jump : "render-forecast-time", checked:false
          
        },
        { 
          text : "I'd like to hear a longterm forecast ",
          jump : "render-forecast-days"
        },
        { text : "I need a forecast for a different location",
          jump : "select-location"
        }
      ]
    },

    "render-forecast-time" : {
      enter : "In what part of day are you interested?",
      leave : prepareForecast,
      options : [
        {text : "morning", jump : "forecast-for-morning", checked:false},
        {text : "noon", jump : "forecast-for-noon"},
        {text : "afternoon", jump : "forecast-for-afternoon"},
        {text : "evening", jump : "forecast-for-evening"},
        {text : "late evening", jump : "forecast-for-late-evening"},
        {text : "night", jump : "forecast-for-night"}
      ]
    },

    "render-forecast-days" : {
      enter : "In what day are you interested?",
      leave : prepareForecast,
      options : [
        {text : "Sunday", jump : "sunday", checked:false},
        {text : "Monday", jump : "monday"},
        {text : "Tuesday", jump : "tuesday"},
        {text : "Wednesday", jump : "wednesday"},
        {text : "Thursday", jump : "thursday"},
        {text : "Friday", jump : "friday"},
        {text : "Saturday", jump : "saturday"},
        {text : "Next week, please", jump : "next-week-forecast"}
      ]
    },

    "unknown-option" : {
      enter : "Oops! I'm confused and don't know what to say. Sorry.",
      options : [
        {text : "I don't know either"},
        {text : "Forget about that, let's start again"},
        {text : "Just give say me what the weather is like",
         jump : "request-weather"},
        {text : "Let me help you. Give me a bug report form",
         jump : "enter-bug-report"
        }
      ]
    }
  };

  function say(message) {
    $('#response').fadeOut(100, function () {
      $(this).html("<p /><p>" + message + "</p>").fadeIn(); 
    });
  }

  function renderMap(self, ready) {
    say("Drag the marker to your location");
    
    $("#lat").val("0");
    $("#lng").val("0");
    $("#google-map-location-selector").fadeIn(function() {
      $("#map").geolocate({
	    lat: "#lat",
	    lng: "#lng",
        address : ["#city"],
	    mapOptions: {
	      disableDefaultUI: true,
	      zoom: 1
	    },
	    markerOptions: {
		  title: "This is your selected location"
	    }
      });
      ready(self);
    });
  }

  function finishMap(self, next, ready) {
    $("#google-map-location-selector").fadeOut(function() {
      if (next === "request-weather") {
        var city = $("#city").val();
        
        self.location = city != "" 
          ? city : {lat : $("#lat").val(), lng : $("#lng").val()};
        ready(self, next);
      }
    });
  }

  function prepareForecast(self, next, ready) {
    function dayHour(n) {
      return (n).hoursAfter(Date.create().beginningOfDay());
    }
    var time = ({
      "forecast-for-morning": dayHour(8),
      "forecast-for-noon"   : dayHour(12),
      "forecast-for-afternoon" : dayHour(16),
      "forecast-for-evening"   : dayHour(18),
      "forecast-for-late-evening" : dayHour(21),
      "forecast-for-night" : dayHour(24)
    })[next];

    if (time !== undefined) {
      self.method="forecast";
      self.weather = {time : time};
      console.log(self.weather);
      ready(self, "request-weather");
    } else if (next == "next-week-forecast") {
      self.nextWeekForecast = true;
      ready(self, "render-forecast-days");
    } else {
      var week = 
            "nextWeekForecast" in self && self.nextWeekForecast ? "next" : "this";
      var time = Date.create([next, "of", week, "week"].join(" "));
      self.method = "forecast/daily";
      self.weather = {time : (12).hoursAfter(time)};
      self.nextWeekForecast = false;
      ready(self, "request-weather");
    }
  }

  function guessLocation(ready) {
    function reverseGeoCoding(lat, lng) {
      var geo = new google.maps.Geocoder();
      var latlng = new google.maps.LatLng(lat, lng);
      geo.geocode({'latLng': latlng}, function(results, status) {
        console.log("got reverse geocode. parsing");
        
        if (status == google.maps.GeocoderStatus.OK) {
          var city = undefined;
          results[0].address_components.each(function(addr) {
            if (addr.types[0] == "locality") {
              city = addr.short_name;
            }
          });

          if (city === undefined)
            ready({lat:lat, lng:lng});
          else 
            ready(city);
        } else {
          console.log("geocoder request has failed: " + status);
          ready({lat:lat, lng:lng});
        }
      });
    }

    if ("geolocation" in navigator) {
      console.log("trying to geolocate");
      navigator.geolocation.getCurrentPosition(function(position) {
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;
        console.log("got coordinates, reverse geocoding");
        reverseGeoCoding(lat,lng);
      }, function(error) {
        console.log(error);
        if (google.loader.ClientLocation)
          ready(google.loader.ClientLocation.address.city);
        else
          ready("Paris");
      });
    } else {
      if (google.loader.ClientLocation)
        ready(google.loader.ClientLocation.address.city);
      ready("Paris");
    }
  }

  function renderWeather(self, ready) {
    var report = self.weather;
    var temp = self.temperatureToNumber(
      "main" in report ? report.main.temp : report.temp.day);

    var time = (function() {
      var now = Date.create();
      var time = Date.create(self.weather.time);
      return {
        day : time.isYesterday()
          ? "Yesterday" : time.isTomorrow() 
          ? "Tomorrow"  : time.isToday()
          ? "Today"     : time.short(),
        hour : time.format("{24hr}"),
        isFuture : time.isFuture()
      };
    })();

    var placename = Object.isString(report.location)
          ? ["at", report.location].join(" ")
          : "in the place you've specified";

    console.log(time);

    console.log("rendering weather");

    var temperature = [
      time.day, ,
      time.isFuture ? 
        ("at", time.hour, "o'clock", "it will be") 
        : "it is",
      temp, "degrees", placename
    ].join(" ");

    var conditions = (function() {
      var isRainy = report.weather.some({main: "Rain"});
      var isRisky 
            =  report.weather.some({description : /.*shower.*/i})
            || report.weather.some({id : /5(02|03|04|11)/})
            || report.weather.some({description : /.*thunderstorm.*/i}) ;
      var isClear = report.weather.some({id : 800});
      var descriptions = report.weather
            .map(function(weather) {return weather.description;})
            .join(" and ");
      
      var result=[];
      if (isRisky && isRainy) {
        result = 
          ["Think twice before leaving your shelter or be ready to", descriptions];
      } else if (isRainy) {
        result = ["Be sure to take your umbrella, as I expect", descriptions ];
      } else if (isClear) {
        result = time.isFuture ? ["The sky will be clear"] : ["The sky is clear"];
      } else {
        result = ["I'm expecting the", descriptions];
      }
      return result.join(" ");
    })();

    say([temperature, conditions, ""].join(". "));
    self.greeted = true;
    ready(self);
  }

  function requestWeather(self, ready) {
    var location = self.location;
    say(["I'm preparing a weather report for you.", 
         "It can take some time. Please, wait for a while."].join(' '));
    ready(self);

    // silently abort previous requests
    if ("request" in self && "abort" in self.request)
      try {self.request.abort();} catch (exn) {};


    var url = (function() {
      var enc = encodeURIComponent;
      var query = Object.isString(location) 
            ? ["q=", enc(location)].join("") 
            : ["lat=", enc(location.lat), "&lon=", enc(location.lng)].join("");
      var cnt = self.method == "forecast/daily" ? "&cnt=14" : "";
      return [
        "http://api.openweathermap.org/data/2.5/",
        self.method, "?", query, cnt].join("");
    })();
    
    console.log(url);
           
    self.request = $.ajax({
      url : url,
      dataType : "jsonp",
      success : function(weather) {
        var weather = (function () {
          if (!/forecast.*/.test(self.method)) 
            return weather;
          console.log("looking up for a forecast nearest to" + self.weather.time);

          // there is a bug in openweathermap API: field dt contains wrong date
          // (it misses one digit). So I'm using dt_txt field to search for the
          // nearest weather report. Unfortunately in a case of a daily forecast
          // there is not dt_txt field so we need to implement a different algo.
          
          if (self.method === "forecast") {
            // sort forecast reports by the «distance» from the require time
            var sorted = weather.list.sortBy(function(report) {
              var t = Date.create(report.dt_txt);
              return Math.abs(t.secondsSince(self.weather.time));
            });
            console.log(sorted);
            return sorted[0];
          } else {
            var n = Date.create().daysUntil(self.weather.time);
            // silently ignore retrospective requests
            return weather.list[Math.max(n, 0)];
          }
        })();
        console.log(weather);
        var time = Date.create();
        if ("weather" in self && "time" in self.weather) {
          console.log("setting weather to " + self.weather.time);
          time = self.weather.time;
        }
        self.weather = weather;
        self.weather.location = location;
        self.weather.time = time;
        console.log("weather is ready, dispatching");
        dispatch(self, "weather-report");
      }
    });
  }

  function renderOptions(self, options, jump) {
    function renderOption(n, option) {
      var id = "option-" + n;
      var text = option.text;
      var radio = $("<input />")
            .attr("type", "radio")
            .attr("id", id)
            .attr("name", "choice");

      radio.attr("value", "jump" in option ? option.jump : self.from);

      if (n == 0 && ("checked" in option && option.checked) ||
          n == 0 && !("checked" in option)) 
        radio.attr("checked", "checked");

      var label = $("<label />").attr("for", id).html(text);
      var row = $("<div />").addClass("row")
            .append(radio).append(label);
      $("#options").append(row);
    }

    
    $("#options").fadeOut(200, function() {
      $(this).html("");
      $.each(options, renderOption);
      $("input[name='choice']").on("change", function () {
        if ("value" in this) 
          jump(self, this.value);
        
      });
      $(this).fadeIn();
    });
  }

  function dispatch(self, name) {
    console.log("entering state " + name);
    var name = name in dialogs ? name : "unknown-option";
    var state = dialogs[name];
    self.state = state;
    self.enterTime = Date.now();
    var inState = function(self) {
      var options = "options" in state ? state.options : [];
      renderOptions(self, options, function(self, next) {
        self.from = name;
        self.leaveTime = Date.now();
        if ("leave" in state) {
          state.leave(self, next, function(self, next) {
            dispatch(self, next);
          });
        } else {
          dispatch(self, next);
        }
      });
    };
    if ("enter" in state) {
      if ($.isFunction(state.enter))
        state.enter(self, inState);
      else {
        say(state.enter);
        inState(self);
      } 
    } else  
      inState(self);
  }
  
  $("#google-map-location-selector").hide();
  $(document).ready(function() {
    guessLocation(function (location) {
      dispatch({
        location : location,
        method : "weather",
        temperatureToNumber : function(K) {
          return (K - 273.15).toFixed();
        }
      }, "request-weather");
    });
  });

})(jQuery);
