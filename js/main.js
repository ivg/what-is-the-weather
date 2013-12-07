// -*- js2-basic-offset: 2 -*-
/*global jQuery, Weather */

(function($) {
  var dialogs = {
    "request-weather" : {
      enter : requestWeather,
      options : [
        { text : "Ok. I'll wait"},
        { text : "So? Use the force!"},
        { text : "I'm tired to wait!"},
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
        { text : "It is interesting... but I live in a different place.",
          jump : "select-location"}, 
        { text : "Fine, but I need a forecast for another time",
          jump : "select-forecast"
        },
        { text : "Good, please, give me a weather for another place",
          jump : "select-location"
        }
      ]
    },

    "select-location" : {
      enter : "Please, choose the method you prefer",
      options : [
        { text : "Show me the map",
          jump : "render-map", checked : false
        },
        { text : "Ask my browser, it knows the location",
          jump : "start-geolocation"
        },
        { text : "I'll input a city name manually",
          jump : "render-city-input"
        }
      ]
    },
    
    "start-geolocation" : {
      enter : "Please, allow your browser to give me your location."
    },
    
    "render-map" : {
      enter : renderMap,
      leave : finishMap,
      options : [
        {text : "Ok. Here I am!", checked : false, jump : "request-weather"},
        {text : "It doesn't work for me, let's try another method",
         jump : "select-location"
        }
      ]
    },
    
    "select-forecast" : {
      enter : "For what date, time or place would like to know the weather?",
      options : [
        { text : "I'd like to know the weather for today",
          jump : "render-forecast-time"
        },
        { 
          text : "I need the weather for this particular date",
          jump : "render-forecast-date"
        },
        { text : "I need a forecast for a different location",
          jump : "select-location"
        }
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

  var initialState = {
    location : guessLocation(),
    temperatureToNumber : function(K) {
      return (K - 273.15).toFixed();
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
        self.location = $("#city").val();
        ready(self);
      }
    });
  }

  function enterCityName(self, ready) {
  }

  function enterCoordinates(){
    return $("<input />").attr("type", "input");
  }

  function enterDate() {
    return $("<input />").attr("type", "input");
  }
  function enterTime() {
    return $("<input />").attr("type", "input");
  }

  function guessLocation(state) {
    if (google.loader.ClientLocation) {
      return google.loader.ClientLocation.address.city;
    } else {
      console.log("Google was not able to detect location");
      return "Paris";
    }
  }

  function renderWeather(self, ready) {
    var w = self.weather;
    var time = self.weather.time;
    var temp = self.temperatureToNumber(w.main.temp);

    console.log("rendering weather");
    say(
      ["Hi, it is", temp, "C in", self.weather.location, "at", time].join(" "));
    self.greeted = true;
    ready(self);
  }

  function requestWeather(self, ready) {
    var location = self.location;
    say(["I'm preparing a weather report for you.", 
         "It can take some time. Please, wait for a while."].join(' '));
    ready(self);
    if ("request" in self && "abort" in self.request)
      try {self.request.abort();} catch (exn) {};
      
    var url = "http://api.openweathermap.org/data/2.5/weather?q=";
           
    self.request = $.ajax({
      url : url + encodeURIComponent(location),
      dataType : "jsonp",
      success : function(weather) {
        console.log(weather);
        self.weather = $.extend(weather, {
          time : Date.now(),
          location : location
        });
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
      var row = $("<div />").addClass("row collapse")
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
          state.leave(self, next, function(self) {
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
    dispatch(initialState, "request-weather");
  });


})(jQuery);





