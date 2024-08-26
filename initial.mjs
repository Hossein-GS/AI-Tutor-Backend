import * as dotenv from 'dotenv';
dotenv.config();

import OpenAI from 'openai';
const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI();

import cors from 'cors';


import express, { text } from 'express';
const app = express();

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import open from 'open';
import ejs from 'ejs';
import * as cheerio from 'cheerio';
import * as puppeteer from 'puppeteer';

const YOUTUBE_API_KEY = 'AIzaSyB5yHTtszhb7R_o3QGFGtFi_im44JC9qT4';
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

let quizSample = `
  {
  "quiz": {
    "questions": [
      {
        "question": "What is the capital of France?",
        "type": "MCQ",
        "options": ["London", "Paris", "Berlin", "Madrid"],
        "answer": "Paris"
      },
      {
        "question": "Who wrote the play 'Romeo and Juliet'?",
        "type": "Short Answer",
        "answer": "William Shakespeare"
      },
      {
        "question": "What is the chemical symbol for gold?",
        "type": "MCQ",
        "options": ["Au", "Ag", "Pb", "Fe"],
        "answer": "Au"
      },
      {
        "type": "Short Answer",
        "answer": "7"
      },
      {
        "question": "Which planet is known as the Red Planet?",
        "type": "MCQ",
        "options": ["Venus", "Mars", "Jupiter", "Saturn"],
        "answer": "Mars"
      }
    ]
  }
}
`;

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
    // Generate video using the API
    const response = await axios.post('https://video-ai.invideo.io/api/copilot/request/chatgpt-new-from-script', {
      script: textPrompt,
      settings: 'male voiceover, professional tone of speaking, 3 minutes long, follow the script',
      title: 'Educational Video on ' + topic,
      description: 'Educational video on ' + topic + ' for students.',
      platforms: ['Youtube'],
      audiences: ['Students'],
      length_in_minutes: 3
    });

    let videoUrl = response.data.video_url;
    console.log('Video URL:', videoUrl);

    //open(videoUrl);
    //await new Promise(resolve => setTimeout(resolve, 20000)); // Wait for 5 seconds before returning the video URL

    

    return videoUrl;

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
  //console.log('Quiz:', quiz);
  return quiz;
}

//const image = fs.createReadStream("picture.jpg"); 
const image_path = "uploads/picture.jpg";

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
    file: fs.createReadStream("audio.m4a"),
    model: "whisper-1",
  });

  console.log(transcription.text);
  const topic = transcription.text;
  return topic;
}
//audio = fs.createReadStream("FILE_LOCATION/name_of_the_file.file_type");

const speechFile = path.resolve("./speech.mp3");

app.post('/upload_picture', upload.single('picture'), async (req, res) => {

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "What is this in the image, explain it to the student and ask what they want to know about it." },
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
  const answer = response.choices[0].message.content;
  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice: "shimmer",
    input: answer,
  });
  console.log(speechFile);
  const buffer = Buffer.from(await mp3.arrayBuffer());
  await fs.promises.writeFile(speechFile, buffer);

  res.send(speechFile);
});

app.post('/upload_audio', upload.single('audio'), async (req, res) => {
  res.send('audio uploaded successfully');
});



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

app.post('/search-video', async (req, res) => {
  const searchQuery = req.body.query;

  try {
    const response = await axios.get(YOUTUBE_API_URL, {
      params: {
        part: 'snippet',
        q: searchQuery,
        type: 'video',
        maxResults: 5,
        key: YOUTUBE_API_KEY
      }
    });

    const videoResults = response.data.items.map(item => ({
      title: item.snippet.title,
      videoId: item.id.videoId,
      description: item.snippet.description
    }));

    res.json({ videos: videoResults });
  } catch (error) {
    res.status(500).send('Error searching YouTube: ' + error.message);
  }
});

app.post('/conversation', async (req, res) => {
  const conversation = req.body.conversation; // Expecting an array of message objects
  const question = req.body.question; // A string representing the latest user question
  
  try {
    // Transform the conversation array to match the format required by OpenAI
    const formattedConversation = conversation.map(msg => ({
      role: msg.sender === 'ai' ? 'assistant' : 'user',
      content: msg.text === undefined ? 'video url' : msg.text
    }));

    // Add the latest user question to the conversation
    formattedConversation.push({ role: 'user', content: question });

    console.log('Formatted Conversation:', formattedConversation);

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful teacher that answers questions. If the student asks for a video, just reply with 1 (ONLY THE NUMBER 1 NOTHING EXTRA). If the students asks you to generate a video, just reply with 2 (ONLY THE NUMBER 2 NOTHING EXTRA). If the user is ready for an assessment or asks for it just reply with 3 (ONLY THE NUMBER 3 NOTHING EXTRA)'},
        ...formattedConversation // Spread the formatted conversation into the messages array
      ]
    });

    const result = response.choices[0].message.content;

    if (result === '1') {
      // Fetch video from YouTube API
      const youtubeResponse = await axios.get(YOUTUBE_API_URL, {
        params: {
          part: 'snippet',
          q: question,
          type: 'video',
          maxResults: 1,
          key: YOUTUBE_API_KEY
        }
      });

      const videoURL = `//www.youtube.com/watch?v=${youtubeResponse.data.items[0].id.videoId}`;
      console.log('Video URL:', videoURL);

      // Send response with video URL
      return res.json({ result, status: 1, videoURL });
    } else if (result === '2') {
      // Generate video using OpenAI
      const script = await generateScript(question);
      const videoURL = await createVideo(script, question);
      console.log('Video URL:', videoURL);

      // Send response with video URL
      return res.json({ result, status: 2, videoURL });
    } else if (result === '3') {
      // Generate quiz using OpenAI
      //const quiz = await generateAssesment(question);
      //console.log('Quiz:', quiz);

      const quizGen = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that generates quizzes for educational videos' },
          ...formattedConversation, // Spread the formatted conversation into the messages array
          { role: 'user', content: 'Can you generate a quiz in JSON format about ' + question + '? The quiz should have 5 MCQ questions. The format should be questions, type, options if it is MCQ, and answer. also make sure that the response is according to the previous message topic or video that the student asks. dont say sure, here it is or whatever just send the JSON formatted quiz. you can follow the following format' + quizSample }
        ]
      });

      const quiz = quizGen.choices[0].message.content;

      const formattedQuiz = JSON.parse(quiz);

      // Send response with quiz
      return res.json({ result, status: 3, formattedQuiz });
    }

    // Send response for non-video requests
    console.log('Response:', result);
    console.log('Status:', 0);
    return res.json({ result, status: 0 });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).send('Error generating response: ' + error.message);
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
