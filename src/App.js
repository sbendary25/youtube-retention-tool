import React, { useState, useEffect } from "react";
import YouTube from "react-youtube";
import "./App.css";
var moment = require("moment");
var momentDurationFormatSetup = require("moment-duration-format");
console.log(moment.duration("PT5M33S").format("hh:mm:ss"));

function App() {
  const [videos, setVideos] = useState([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [loadRetention, setLoadRetention] = useState(true);
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  useEffect(() => {
    window.gapi.load("client:auth2", function() {
      window.gapi.auth2.init({
        client_id:
          "880945636048-tr1frgje4ob4o1skqdkimptbh0nbnrds.apps.googleusercontent.com"
      });
    });
  });

  useEffect(() => {
    if (authenticated) {
      getVideos();
    }
  }, [authenticated]);

  useEffect(() => {
    if (Object.keys(videos).length > 0 && loadRetention) {
      getRetentionData();
    }
  }, [videos, loadRetention]);

  const authenticate = () => {
    return window.gapi.auth2
      .getAuthInstance()
      .signIn({
        scopes: [
          "https://www.googleapis.com/auth/youtube.readonly",
          "https://www.googleapis.com/auth/youtube.force-ssl"
        ]
      })
      .then(
        function() {
          console.log("Sign-in successful");
        },
        function(err) {
          console.error("Error signing in", err);
        }
      );
  };

  const loadClient = () => {
    window.gapi.client.setApiKey("AIzaSyB5tUiVzgowjlAouVx7eucGcqk17wqaOvM");
    return window.gapi.client
      .load("https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest")
      .then(
        function() {
          setAuthenticated(true);
          console.log("window.gapi client loaded for API");
        },
        function(err) {
          console.error("Error loading window.gapi client for API", err);
        }
      );
  };

  const getVideos = async () => {
    let tmpVideoData = {};
    window.gapi.client.setApiKey("AIzaSyBxP9XqMyhtki7RwffuaE5xdH42rOIXs_Q");
    window.gapi.client
      .load("https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest")
      .then(
        function() {
          console.log("window.gapi client loaded for API");
        },
        function(err) {
          console.error("Error loading window.gapi client for API", err);
        }
      );

    await window.gapi.client.youtube.search
      .list({
        part: ["snippet"],
        forMine: true,
        maxResults: 25,
        type: ["video"]
      })
      .then(
        function(response) {
          // Handle the results here (response.result has the parsed body).
          // setVideos(response.result.items);
          response.result.items.forEach(x => {
            let id = x.id.videoId;
            let title = x.snippet.title;
            let thumbnail = x.snippet.thumbnails.default.url;
            let publishedAt = x.snippet.publishedAt;
            tmpVideoData[id] = { id, title, thumbnail, publishedAt };
          });
        },
        function(err) {
          console.error("Execute error", err);
        }
      );

    await window.gapi.client.youtube.videos
      .list({
        part: ["snippet,contentDetails,statistics"],
        id: [Object.keys(tmpVideoData).join(",")]
      })
      .then(
        function(response) {
          response.result.items.forEach(x => {
            let id = x.id;
            let duration = moment
              .duration(x.contentDetails.duration)
              .format("hh:mm:ss");
            let viewCount = x.statistics.viewCount;
            tmpVideoData[id] = { ...tmpVideoData[id], duration, viewCount };
          });
          setVideos(tmpVideoData);
          // Handle the results here (response.result has the parsed body).
          console.log("Response", response);
        },
        function(err) {
          console.error("Execute error", err);
        }
      );
  };

  // Make sure the client is loaded and sign-in is complete before calling this method.
  const getRetentionData = async () => {
    setLoadRetention(false);
    await window.gapi.client.setApiKey(
      "AIzaSyBxP9XqMyhtki7RwffuaE5xdH42rOIXs_Q"
    );
    await window.gapi.client
      .load(
        "https://youtubeanalytics.googleapis.com/$discovery/rest?version=v2"
      )
      .then(
        function() {
          console.log("window.gapi client loaded for API");
        },
        function(err) {
          console.error("Error loading window.gapi client for API", err);
        }
      );

    let tmpVideoData = videos;

    Object.keys(videos).forEach(async videoId => {
      await window.gapi.client.youtubeAnalytics.reports
        .query({
          dimensions: "elapsedVideoTimeRatio",
          endDate: "2022-06-30",
          filters: `video==${videoId}`,
          ids: "channel==MINE",
          metrics: "audienceWatchRatio,relativeRetentionPerformance",
          startDate: "2010-05-01"
        })
        .then(
          function(response) {
            let columnHeaders = response.result.columnHeaders;
            let rows = response.result.rows;
            // Handle the results here (response.result has the parsed body).
            tmpVideoData[videoId]["retentionData"] = { columnHeaders, rows };
            console.log("Response", response);
          },
          function(err) {
            console.error("Execute error", err);
          }
        );
    });
    setVideos(tmpVideoData);
  };

  const onReady = event => {
    // access to player in all event handlers via event.target
    event.target.seekTo("1");
    setTimeout(() => {
      event.target.pauseVideo();
    }, 500);
  };

  const playerOpts = {
    playerVars: {
      // https://developers.google.com/youtube/player_parameters
      iv_load_policy: 3,
      rel: 0
    }
  };

  return (
    <div className="App">
      <button
        onClick={async () => {
          await authenticate().then(loadClient);
        }}
      >
        authorize and load
      </button>

      {authenticated ? (
        <div className="grid">
          <div className="div1">
            <h1>Select Video</h1>
            {Object.values(videos).map(video => (
              <div
                className={`video-row ${
                  video.id === selectedVideoId ? "selected" : ""
                }`}
                onClick={() => {
                  setSelectedVideoId(video.id);
                }}
              >
                <img className="vid-col-1" src={video.thumbnail} />
                <p className="vid-col-2">{video.title}</p>
                <p className="vid-col-3">{video.duration}</p>
              </div>
            ))}
          </div>
          <div className="div2">
            <YouTube
              videoId={selectedVideoId}
              opts={playerOpts}
              onReady={onReady}
            />
          </div>
          <div className="div3">c </div>
          <div className="div4"> d</div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
