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
var textOverlay = $.one(".text-overlays .content");
var cueOverlay = $.one(".closed-captions");
var captionCheck = $.one("#enable-captions");

var wish = {
  then: fn => fn()
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
  if (data.caption && !suppressCaption) {
    track.src = `./assets/captions/${data.caption}`;
  } else {
    track.src = "";
  }
}

var playChapter = function(chapter) {
  intro.classList.add("hidden");
  current = chapter;
  var data = videos[chapter];
  var [back, front] = buffers;
  back.pause();
  buffers = [front, back];
  // play video
  loadVideo(data, front);
  var pending = front.play() || wish;
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
          text = data.text;
      }
      textOverlay.innerHTML = text;
      textOverlay.setAttribute("data-type", data.type || "block");
      textOverlay.classList.add("show");
    } else {
      textOverlay.classList.remove("show");
    }
  });

  var preload = videos[chapter + 1];
  wait(1000, () => loadVideo(preload, back, true));
};

var autoAdvance = function() {
  current++;
  playChapter(current);
};

var loading = function() {
  if (this.classList.contains("front")) {
    app.classList.add("loading");
  }
};

var loaded = function() {
  app.classList.remove("loading");
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

var jump = function() {
  var chapter = this.getAttribute("data-chapter");
  playChapter(chapter * 1);
  this.blur();
};

var oncue = function(e) {
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

captionCheck.addEventListener("change", function() {
  if (!captionCheck.checked) {
    cueOverlay.classList.remove("show");
  }
})

var events = {
  ended: autoAdvance,
  timeupdate: timeUpdated,
  click: togglePlayback,
  loadstart: loading,
  waiting: loading,
  loadeddata: loaded,
  playing: loaded,
  cuechange: e => console.log(e)
};

for (var e in events) {
  buffers.forEach(el => el.addEventListener(e, events[e]));
}
buffers.forEach(el => el.querySelector("track").addEventListener("cuechange", oncue));

navbar.innerHTML = videos.map((d, i) => `
<button class="play-chapter" aria-label="chapter ${i + 1}" data-chapter="${i}">
  <div class="highlight"></div>
  <label>${d.title || ""}</label>
</button>
`).join("");

$("button", navbar).forEach(el => el.addEventListener("click", jump));

intro.addEventListener("click", function() {
  playChapter(current);
});

loadVideo(videos[0], buffers[0]);