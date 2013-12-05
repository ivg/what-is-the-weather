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
        { text : "Show me the map, I'll show you",
          jump : "render-map", checked : false
        },
        { text : "I'll input a city name manually",
          jump : "render-city-input"
        }
      ]
    },
    
    "render-map" : {
      enter : renderMap,
      options : [
        {text : "Ok. Here I am!", checked : false}
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
        {text : "Aaa! Forget about that, let's start again"},
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
      return Weather.kelvinToCelsius(K).toFixed();
    }
  };

  function say(message) {
    $('#response').html("<p>" + message + "</p>"); 
  }


  function renderMap(self, ready) {
    var map = $("<div>").attr("id", "map");
    var lat = $("<input>").attr("id", "lat").val("56");
    var lng = $("<input>").attr("id", "lng").val("37");

    $("#response").append(map).append(lat).append(lng);
    $("#map").geolocate({
	  lat: "#lat",
	  lng: "#lng",
	  mapOptions: {
		disableDefaultUI: true,
		zoom: 5
	  },
	  markerOptions: {
		title: "This is your selected location"
	  }
    });
    ready(self);
    
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
    return "Moscow";
  }

  function renderWeather(self, ready) {
    var time = self.weather.time;
    var temp = self.temperatureToNumber(self.weather.temperature());
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
    self.request = Weather.getCurrent(location, function(weather) {
      self.weather = $.extend(weather, {
        time : Date.now(),
        location : location
      });
      console.log("weather is ready, dispatching");
      dispatch(self, "weather-report");
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

    $("#options").html("");
    $.each(options, renderOption);
    $("input[name='choice']").on("change", function () {
      if ("value" in this)
        jump(self, this.value);
    });
  }

  function dispatch(self, name) {
    console.log("entering state " + name);
    var name = name in dialogs ? name : "unknown-option";
    var state = dialogs[name];
    self.state = state;
    self.enterTime = Date.now();
    var inState = function(self) {
      renderOptions(self, state.options, function(self, next) {
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

  $('document').ready(function() {
    dispatch(initialState, "request-weather");
  });


})(jQuery);





