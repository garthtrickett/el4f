const fs = require("fs");
const https = require("https");
const path = require("path");
const lib = require("./vpn_ip_swapper.js");

var accounts = {};
fs.readFile("accounts.json", "utf8", (err, fileData) => {
  if (err) {
    console.error(err);
    return;
  }
  accounts = JSON.parse(fileData);

  let thirtyDaysAgo =
    Math.floor(new Date().getTime() / 1000) - 30 * 24 * 60 * 60;

  let apiKeys = Object.keys(accounts).filter(
    (key) => !accounts[key] || accounts[key] < thirtyDaysAgo,
  );

  if (!apiKeys.length) {
    console.log("No valid API key found");
    return;
  }

  var chunks = [];
  fs.readFile("input/file.txt", "utf8", (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    data = data.replace(/\n/g, " ");
    data = data.replace(/“/g, "'");
    data = data.replace(/”/g, "'");
    data = data.replace(/–/g, "");
    data = data.replace(/’/g, "'");
    data = data.replace(/‘/g, "'");

    while (data.length > 0) {
      let index = data.lastIndexOf(".", 1500);
      if (index === -1) index = 1500;
      chunks.push(data.substring(0, index + 1));
      data = data.substring(index + 1).trim();
    }

    let i = 0;
    let j = 0;

    function sendRequest() {
      let postData = JSON.stringify({
        text: chunks[i],
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0,
          use_speaker_boost: true,
        },
      });
      console.log(postData);

      let options = {
        hostname: "api.elevenlabs.io",
        port: 443,
        path: "/v1/text-to-speech/TxGEqnHWrfWFTfGW9XjX?optimize_streaming_latency=0&output_format=mp3_44100_128",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": postData.length,
          "xi-api-key": apiKeys[j],
        },
      };

      let req = https.request(options, (res) => {
        console.log(`Status Code: ${res.statusCode}`);

        async function handleResponse(res) {
          if (res.statusCode == 401) {
            await lib.get_static_ip();
            // You can use get_static_ip_result here
          }
          // Rest of your code
        }

        // Use the function
        handleResponse(res);

        if (res.statusCode !== 200) {
          accounts[apiKeys[j]] = Math.floor(new Date().getTime() / 1000);
          fs.writeFile("accounts.json", JSON.stringify(accounts), (err) => {
            if (err) console.error(err);
          });

          j++;
          if (j < apiKeys.length) {
            sendRequest();
          } else {
            console.log("No valid API key found");
          }
        } else {
          let outputDir = "output";
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
          }

          let files = fs.readdirSync(outputDir);

          let maxNumber = files.reduce((max, file) => {
            let number = parseInt(file.split(".")[0]);
            return number > max ? number : max;
          }, 0);

          let outputFile = path.join(outputDir, `${maxNumber + 1}.mp3`);

          const file = fs.createWriteStream(outputFile);
          res.pipe(file);

          i++;
          if (i < chunks.length) {
            sendRequest();
          }
        }
      });

      req.on("error", (error) => {
        console.error(error);
      });

      req.write(postData);
      req.end();
    }

    sendRequest();
  });
});
