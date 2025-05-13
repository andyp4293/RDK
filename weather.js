'use strict';
const fs = require('node:fs'); // import to for reading and writing files
const path = require('node:path');// import to for file paths
const readline = require('node:readline/promises'); // import to for reading user input
const { stdin: input, stdout: output } = require('node:process'); // import to for input and output 

// utilize fetch depending on the version of node.js
const fetch =
  typeof global.fetch === 'function'
    ? global.fetch
    : require('node-fetch'); 



const DOTENV = path.join(process.cwd(), '.env'); // makes a path for the current directory for .env file 

// function to load local environment variables from .env file
function loadLocalEnv() {
    if (!fs.existsSync(DOTENV)) return;
    for (const line of fs.readFileSync(DOTENV, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
        if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/(^['"]|['"]$)/g, '');
        }
    }
}

// function to ask the user for an API key if one isn't already set in the .env
async function ensureApiKey() {

    // return the API key if it's already in the .env file 
    if (process.env.OPENWEATHER_API_KEY) return process.env.OPENWEATHER_API_KEY;

    // creates readline interface for the user to input their API key
    const rl = readline.createInterface({ input, output });

    // prompt the user for their API key 
    const key = (await rl.question('Enter your OpenWeather API key: ')).trim();
    rl.close();

    if (!key) { // if nothing was entered for api, the program closes
        console.error('API key is required.');
        process.exit(1);
    }


    fs.writeFileSync(DOTENV, `OPENWEATHER_API_KEY=${key}\n`); // write the API key to the .env file
    console.log('Saved API key to .env');

    // sets the envrionment variable for the API key
    process.env.OPENWEATHER_API_KEY = key;
    return key; // return the API key
}

// main function to run the weather app
(async () => { 
    loadLocalEnv(); // load the environment variables from .env file
    const API_KEY = await ensureApiKey(); // get the API key from the environment variables or ask the user for it if there is none

    // url for API calls to the OpenWeather API
    const BASE_URL = 
        'https://api.openweathermap.org/data/2.5/weather?units=metric&appid=' +
        API_KEY;

    const FAV_FILE = './favourites.json';
    let favourites = [];

    // load favourites from file if it exists 
    if (fs.existsSync(FAV_FILE)) {
    try {
        favourites = JSON.parse(fs.readFileSync(FAV_FILE, 'utf8'));
    } catch (e) {
        favourites = [];
    }
    }

    // save updated favourites to file
    function saveFavourites() {
        fs.writeFileSync(FAV_FILE, JSON.stringify(favourites, null, 2));
    }

    // function to fetch current weather data for a city from the OpenWeather API 
    async function fetchWeather(city) {
        const res = await fetch( // fetch the weather data from the API with given city 
        `${BASE_URL}&q=${encodeURIComponent(city)}`
        );
        if (!res.ok) {
        throw new Error(
            res.status === 404
            ? `City "${city}" not found.` // if city not found, throw error
            : `OpenWeather error (${res.status})`  // if there is an error with the API, throw error
        );
        }
        const data = await res.json(); // parse the API response as a json object
        return { // return the weather data in a formatted object
            city: data.name,
            temp: data.main.temp,
            description: data.weather[0].description,
            humidity: data.main.humidity,
            wind: data.wind.speed,
        };
    }

  function printWeather(w) { // prints the city and current weather data to the console
    console.log(
      `${w.city}: ${w.temp}°C, ${w.description} | Humidity ${w.humidity}% | Wind ${w.wind} m/s`
    );
  }

  // object to hold the commands for the command line interface
  const commands = {
    async search([city]) { // search for the user inputted city and fetch the weather data
      if (!city) return console.log('Usage: search <city>'); // if no city is inputted, return message how to use the command
      try {
        printWeather(await fetchWeather(city)); // fetch the weather data and print it to the console
      } catch (e) {
        console.error( e.message); // if there is an error, print the error message to the console
      }
    },

    async add([city]) { // function to add a city to the favourites list
        if (!city) return console.log('Usage: add <city>'); // if no city is inputted, return message how to use the command
      
        if (favourites.includes(city)) { // check if the city is already in the favourites list
          return console.log(`"${city}" is already in favourites.`);
        }
      
        if (favourites.length === 3) {
          return console.log('Max favourites of 3 reached. Remove one first or update');
        }
      
        try {
          await fetchWeather(city); // validate city by making sure API fetch works
          favourites.push(city);    // add to favourites array
          saveFavourites();         // persist to favourites.json
          console.log(`Added "${city}"`);
        } catch (e) {
          console.error( e.message); // print error message if city is not valid
        }
      },
      

    async list() { // function to print the current weather of cities in the favourites list
      if (!favourites.length) { // if there is no favourites, return message to add a city 
        return console.log('No favourites yet. Use "add <city>" to add one.');
      }
      console.log('Favourites'); // prints
      await Promise.all( // fetch weather data for each city 
        favourites.map(async (c) => {
          try {
            printWeather(await fetchWeather(c));
          } catch {
            console.log(`Error with ${c}: unable to fetch weather right now`);
          }
        })
      );
    },
    
    // function to remove a city from favourites list
    remove([city]) {
      if (!city) return console.log('Usage: remove <city>'); // if no city is inputted, return message how to use the command
      const i = favourites.indexOf(city);
      if (i === -1) return console.log(`"${city}" is not in favourites.`);
      favourites.splice(i, 1); // remove the city from the favourites array
      console.log(`Removed "${city}"`);
    },

    async update([oldCity, newCity]) { // update to replace a city in the favourites list 
      if (!oldCity || !newCity) { // if no old or new city is inputted, return message how to use the command
        return console.log('Usage: update <oldCity> <newCity>');
      }
      const i = favourites.indexOf(oldCity);
      if (i === -1) return console.log(`"${oldCity}" is not in favourites.`);
      if (favourites.includes(newCity)) {
        return console.log(`"${newCity}" is already in favourites.`);
      }
      try {
        await fetchWeather(newCity); // validate
        favourites[i] = newCity;
        console.log(`Replaced "${oldCity}" with "${newCity}"`);
      } catch (e) {
        console.error(e.message);
      }
    },
  };

  // command line loop for user input
  const rl = readline.createInterface({ input, output, prompt: '> ' });
  console.log('Call Current City Weather - type "help" for commands.'); // prints message how to see commands
  rl.prompt();

  for await (const line of rl) { // for each line of input from the user
    const [cmd, ...args] = line.trim().split(/\s+/);
    if (!cmd) {
      rl.prompt();
      continue;
    }
    if (['exit', 'quit'].includes(cmd)) break; // if user inputs exit or quit, then the program closes

    if (cmd === 'help') { // prints commaands if user inputs help
      console.log(
        `
        Commands
        search <city>       – show weather for <city>
        add    <city>       – add <city> to favourites (max 3)
        list                – list favourites with current weather
        remove <city>       – remove <city> from favourites
        update <old> <new>  – replace <old> with <new>
        exit | quit         – close the app
                `.trim()
      );
      rl.prompt();
      continue;
    }

    const fn = commands[cmd];
    if (typeof fn === 'function') {
      await fn(args);
    } else {
      console.log(`Unknown command "${cmd}". Type "help" for a list.`);
    }
    rl.prompt();
  }

  rl.close();
  console.log('Exiting Weather app...');
})();
