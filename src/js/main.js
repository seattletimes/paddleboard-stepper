// require("./lib/ads");
// var track = require("./lib/tracking");

var $ = require("./lib/qsa");
var h = require("./lib/dom");

var videos = window.videoData;
var current = 0;
var mobileBreak = 400;

var app = $.one(".app");
var buffers = $(".app video");
var navbar = $.one("nav.steps");
var intro = $.one(".intro");
var outro = $.one(".outro");
var textOverlay = $.one(".text-overlays .content");
var cueOverlay = $.one(".closed-captions");
var captionCheck = $.one("#enable-captions");

var wish = {
  then: fn => fn(),
  catch: fn => null
};

var wait = (time, fn) => setTimeout(fn, time);
var preloadTimeout = null;

var videoSource = d => `./assets/videos/${window.innerWidth < mobileBreak ? d.mobile : d.video}`;

var loadVideo = function(data, element, suppressCaption) {
  element.src = videoSource(data);
  var source = h("source", {
    src: videoSource(data),
    type: "video/mp4"
  });
  var track = element.querySelector("track");
  // element.appendChild(source);
  if (data.caption) {
    track.src = `./assets/captions/${data.caption}`;
  } else {
    track.src = "";
  }
};

var playChapter = function(chapter) {
  intro.classList.add("hidden");
  outro.classList.add("hidden");
  cueOverlay.classList.remove("show");
  app.classList.remove("paused");
  current = chapter;
  var data = videos[chapter];
  var [back, front] = buffers;
  if (!back.paused) back.pause();
  buffers = [front, back];
  // play video
  loadVideo(data, front);
  // very, very stupid Safari bug
  // refuses to auto-advance if controls don't exist
  front.setAttribute("controls", "");
  var pending = front.play() || wish;
  pending.catch(err => {
    app.classList.add("paused");
  });
  front.removeAttribute("controls");
  var button = $.one(`[data-chapter="${chapter}"]`);
  if (button) {
    $("button.current").forEach(b => b.classList.remove("current"));
    button.classList.add("current");
  }
  pending.then(function() {
    back.classList.remove("front");
    front.classList.add("front");
    if (data.text) {
      var text;
      switch (data.type) {
        case "lowerthird":
          var [name, title] = data.text.split("\n");
          text = `<h2>${name}</h2>${title}`;
          break;

        default:
          text = data.text.replace(/\n/g, "<br><br>");
      }
      textOverlay.innerHTML = text;
      textOverlay.setAttribute("data-type", data.type || "block");
      textOverlay.classList.add("show");
    } else {
      textOverlay.classList.remove("show");
    }
  });

  var preload = videos[chapter + 1];
  // wait(1000, () => loadVideo(preload, back, true));
};

// video event listeners
var autoAdvance = function() {
  current++;
  if (current >= videos.length) {
    return outro.classList.remove("hidden");
  }
  playChapter(current);
};

var loading = function() {
  if (this.classList.contains("front")) {
    app.classList.add("loading");
  }
};

var loaded = function() {
  app.classList.remove("loading", "paused");
};

var timeUpdated = function(e) {
  var video = e.target;
  var ratio = video.currentTime / video.duration;
  if (ratio) {
    $.one("button.current .highlight").style.width = ratio * 100 + "%";
  }
};

var togglePlayback = function() {
  if (this.paused) {
    this.play();
    app.classList.remove("paused");
  } else {
    this.pause();
    app.classList.add("paused");
  }
};

var events = {
  ended: autoAdvance,
  timeupdate: timeUpdated,
  click: togglePlayback,
  loadstart: loading,
  waiting: loading,
  loadeddata: loaded,
  playing: loaded
};

for (var e in events) {
  buffers.forEach(el => el.addEventListener(e, events[e]));
}

// closed caption events
var oncue = function(e) {
  if (!e.target.parentElement.classList.contains("front")) return;
  var track = e.target.track;
  var cues = track.activeCues;
  var text = Array.prototype.slice.call(cues).map(c => c.text).join("\n").trim();
  if (text && captionCheck.checked) {
    cueOverlay.innerHTML = text;
    cueOverlay.classList.add("show");
  } else {
    cueOverlay.classList.remove("show");
  }
};
buffers.forEach(el => el.querySelector("track").addEventListener("cuechange", oncue));

captionCheck.addEventListener("change", function() {
  if (!captionCheck.checked) {
    cueOverlay.classList.remove("show");
  }
});

// set up the buttons
navbar.innerHTML = videos.map((d, i) => `
<button class="play-chapter" aria-label="chapter ${i + 1}" data-chapter="${i}">
  <div class="highlight"></div>
  <label>${d.title || ""}</label>
</button>
`).join("");

var jump = function() {
  var chapter = this.getAttribute("data-chapter");
  playChapter(chapter * 1);
  this.blur();
};

$("button", navbar).forEach(el => el.addEventListener("click", jump));

// preload the first video
loadVideo(videos[0], buffers[0]);

// go!
intro.addEventListener("click", function() {
  playChapter(current);
});
