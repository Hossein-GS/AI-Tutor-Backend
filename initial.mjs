import * as dotenv from 'dotenv';
dotenv.config();

import OpenAI from 'openai';
const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI();

import cors from 'cors';


import express from 'express';
const app = express();

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import open from 'open';
import ejs from 'ejs';

// Enable CORS for all routes
app.use(cors({
	origin: '*'
}))

// Middleware to parse the request body
app.use(bodyParser.urlencoded({ extended: true }));

// Serve the static files in the public directory
app.use(express.static('public'));

// Parse JSON bodies (as sent by API clients)
app.use(express.json());

// Get the directory name of the current module file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = 3000;

// Serve the HTML form at the root route
app.get('/', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Generate Educational Video</h1>
        <form action="/generate-video" method="post">
          <label for="topic">Topic:</label>
          <input type="text" id="topic" name="topic" required>
          <button type="submit">Generate Video</button>
        </form>
      </body>
    </html>
  `);
});

// Handle form submission
app.post('/generate-video', async (req, res) => {
  const topic = req.body.topic;
  try {
    const script = await generateScript(topic);
    const videoURL = await createVideo(script, topic);
    //const videoURL = await createVideoVeed(script, topic);
    //const videoURL = await createVideoAI(script, topic);
    const quiz = await generateAssesment(topic, script);
    // Open the video URL in the backend server's default browser
    //open(videoURL);
    
    //res.render('video-frame', { videoURL, topic, script, quiz });

    res.send(`
      <html>
        <body>
          <h1>Video Generated Successfully</h1>
          <p>Topic: ${topic}</p>
          <p>Script: ${script}</p>
          <p>Quiz: ${videoURL}</p>
          <p>Video URL: <a href="${videoURL}">${videoURL}</a></p>
          <div id="video-container">
            <iframe width="560" height="315" src="${videoURL}" frameborder="0" allowfullscreen></iframe>
          </div>
        </body>
      </html>
    `);


  } catch (error) {
    res.status(500).send('Error generating video: ' + error.message);
  }
});

// Function to generate script using OpenAI
async function generateScript(topic) {
  const completion = await openai.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are a helpful assistant that generates scripts for educational videos' },
      { role: 'user', content: 'Can you generate a script for a 3-minute educational video about ' + topic + '?' }
    ],
    model: 'gpt-3.5-turbo-0125'
  });

  const script = completion.choices[0].message.content;
  return script;
}

// Function to generate video using the plugin API
async function createVideo(textPrompt, topic) {
  try {
    const response = await axios.post('https://video-ai.invideo.io/api/copilot/request/chatgpt-new-from-script', {
      script: textPrompt,
      settings: 'male voiceover, professional tone of speaking, 3 minutes long, follow the script',
      title: 'Educational Video on ' + topic,
      description: 'Educational video on ' + topic + ' for students.',
      platforms: ['Youtube'],
      audiences: ['Students'],
      length_in_minutes: 3
    });

    const videoUrl = response.data.video_url;

    // Ensure the videos directory exists
    const videoDir = path.join(__dirname, 'videos');
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir);
    }

    const videoFileName = `${topic}_educational_video.mp4`; // Example filename
    const downloadPath = path.join(videoDir, videoFileName);

    const writer = fs.createWriteStream(downloadPath);
    const responseStream = await axios({
      url: videoUrl,
      method: 'GET',
      responseType: 'stream'
    });

    responseStream.data.pipe(writer);

    return response.data.video_url;

    //return new Promise((resolve, reject) => {
    //  writer.on('finish', () => resolve(downloadPath));
    //  writer.on('error', reject);
    //});
  } catch (error) {
    console.error('Error creating video:', error.message);
    throw error; // Rethrow the error for handling in higher levels
  }
}

// Function to generate assessment using OpenAI
async function generateAssesment(topic, script) {
  const completion = await openai.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are a helpful assistant that generates scripts for educational videos' },
      { role: 'user', content: 'Can you generate a quiz in JSON format about ' + topic + '? The quiz should have 5 questions with a mix of MCQ, and short answers. The format should be questions, type, options if it is MCQ, and answer. the questions should be made from the following script: ' +  script}
    ],
    model: 'gpt-3.5-turbo-0125'
  });

  const quiz = completion.choices[0].message.content;
  return quiz;
}

//const image = fs.createReadStream("picture.jpg"); 
const image_path = "picture.jpg";

function encodeImage(image_path) {
  const image = fs.readFileSync(image_path);
  const encodedImage = Buffer.from(image).toString('base64');
  return encodedImage;
}

const image = encodeImage(image_path);

async function getTopicFromPicture(image) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "What is the key word in this image? (just give a short response you can use multiple words if nessecary)" },
          {
            type: "image_url",
            image_url: {
              "url": "data:image/jpeg;base64," + image,
            },
          },
        ],
      },
    ],
  });
  console.log(response.choices[0].message.content);
  const topic = response.choices[0].message.content;
  return topic;
}

async function getTopicFromAudio(audio) {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream("AUDIO.m4a"),
    model: "whisper-1",
  });

  console.log(transcription.text);
  const topic = transcription.text;
  return topic;
}
//audio = fs.createReadStream("FILE_LOCATION/name_of_the_file.file_type");



app.post('/generate-text', async (req, res) => {
  const topic = req.body.topic;
  try {
    const script = await generateScript(topic);
    const videoURL = await createVideo(script, topic);
    const quiz = await generateAssesment(topic);
    res.render('video-frame', { videoURL, topic, script, quiz });
  } catch (error) {
    res.status(500).send('Error generating video: ' + error.message);
  }
}
);

app.post('/send-image', async (req, res) => {
  const image = req.body.image;
  try {
    const topic = await getTopicFromPicture(image);
    const script = await generateScript(topic);
    const videoURL = await createVideo(script, topic);
    const quiz = await generateAssesment(topic, script);
    //res.render('video-frame', { videoURL, topic, script, quiz });
    res.json({ topic, videoURL, quiz });
  } catch (error) {
    //res.status(500).send('Error generating video: ' + error.message);
    res.json({ error: error.message });
  }
});

app.post('/send-audio', async (req, res) => {
  const audio = req.body.audio;
  try {
    const topic = await getTopicFromAudio(audio);
    const script = await generateScript(topic);
    const videoURL = await createVideo(script, topic);
    const quiz = await generateAssesment(topic, script);
    //res.render('video-frame', { videoURL, topic, script, quiz });
    res.json({ topic, videoURL, quiz });
  } catch (error) {
    //res.status(500).send('Error generating video: ' + error.message);
    res.json({ error: error.message });
  }
});

app.post('/send-text', async (req, res) => {
  const {text} = req.body;
  console.log(text);
  try {
    const topic = text;
    const script = await generateScript(topic);
    const videoURL = await createVideo(script, topic);
    const quiz = await generateAssesment(topic, script);
    console.log("videoURL: ", videoURL);
    console.log("topic: ", topic);
    console.log("quiz: ", quiz);
    //res.render('video-frame', { videoURL, topic, script, quiz });
    res.json({ topic, videoURL, quiz });
  } catch (error) {
    //res.status(500).send('Error generating video: ' + error.message);
    res.json({ error: error.message });
  }
});

app.post('/test', async (req, res) => {
  console.log("test");
  res.send("test");
});

// check quiz answers recieved from the frontend
app.post('/check-quiz', async (req, res) => {
  const quiz = req.body.quiz;
  const topic = req.body.topic;
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-0125',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that checks quiz answers that are in JSON format. explain why the user is wrong if they are wrong on a question (Keep Responses Short)' },
        { role: 'user', content: quiz }
      ]
    });

    const result = response.choices[0].message.content;
    personalizeVideo(topic, result, quiz);
    res.json({ result });
  } catch (error) {
    res.status(500).send('Error checking quiz: ' + error.message);
  }
});

// personalization of the video
async function personalizeVideo(topic, result, quiz) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-0125',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that creates educational video script on a topic and is focused on the error the user makes after doing the following quiz' +  quiz},
        { role: 'user', content: 'Can you create a personalized script for a 3-minute educational video about ' + topic + ' focusing on the error the user made in the quiz?' }
      ]
    });

    const script = response.choices[0].message.content;
    createVideo(script, topic);
  } catch (error) {
    console.error('Error personalizing video:', error.message);
    throw error;
  }
}


// Start the server
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
