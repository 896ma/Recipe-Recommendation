const express = require('express');
//const mysql = require('mysql');
const cors = require('cors');
const axios = require('axios');
const cron = require('node-cron');
const app = express();
require("dotenv").config();
const mongoose=require('mongoose')
const connectDB =require('./db')
const port = process.env.PORT || 5050;
const bodyParser = require("body-parser");
const UserInfo=require('./schema')
const admin = require('firebase-admin');
// Initialize Firebase Admin SDK
const serviceAccount = require('./native-functions-dd65b-firebase-adminsdk-1x0vr-19c118f2a5.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  ignoreUndefinedProperties: true, 
  databaseURL: 'default',
});
const db = admin.firestore();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(bodyParser.json());

// connect Database
connectDB(); 
/*
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "users"
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err);
  } else {
    console.log('Connected to MySQL database');
  }
});

app.post('/api/user-data', (req, res) => {
  const {
    Gender = "rather not say",
    Age ,
    Height,
    Weight ,
    Diet_Type,
    Active_Lifestyle = true,
    Fitness_Goal
  } = req.body;

  const sql = "INSERT INTO users (Gender, Age, Height, Weight, Diet_Type, Active_Lifestyle, Fitness_Goal) VALUES (?, ?, ?, ?, ?, ?, ?)";
  const values = [Gender, Age, Height, Weight, Diet_Type, Active_Lifestyle, Fitness_Goal];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error storing user data:', err);
      res.status(500).send('Error storing user data');
    } else {
      console.log('User data stored successfully');
      res.sendStatus(200);
    }
  });
});

app.get('/api/recommended-recipes', (req, res) => {
  const query = "SELECT * FROM recommended_recipes";
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching recommended recipes:', err);
      res.status(500).send('Error fetching recommended recipes');
    } else {
      res.json(results); // Send the fetched recommended recipes data as JSON response
    }
  });
});
*/


app.post('/api/user-data', async (req, res) => {


 // const {name, age, gender, height, weight, goal} = req.body;
  // Create new user object
  const user = new UserInfo({
    _id: new mongoose.Types.ObjectId(),  
    gender: req.body.gender,
    age: req.body.age,
    diet_type: req.body.diet_type,
    activity_lifestyle: req.body.activity_lifestyle,
    medical_history: req.body.medical_history, 
    medical_details: req.body.medical_details,
    weight: req.body.weight,
    height: req.body.height,
    fitness_goal: req.body.fitness_goal
  });

  try {
      
  const savedUser = await user.save();
    
    console.log('User data stored successfully', savedUser._id);
  res.status(201).json({ message: "User created successfully", user: savedUser });
  // Get user details
//const userDetails = await UserInfo.findById(savedUser._id);

//console.log('User details:', userDetails);
  // Recommend recipes
//const recipes = await recommendRecipes(userDetails);


  // Save recipes
 // await db.collection('recipes').add({
  //  userId: userDetails._id,
  //  recipes
  //});

  //console.log('Recipes saved to Firestore');

  } catch (error) {

    // Send error response
    res.status(500).send('Error storing user data');

    console.error('Error storing user data:', error); 
  }
});

app.get('/api/user-info', async (req, res) => {
  try {
    const users = await UserInfo.find();
    console.log('User data:', users);
    res.json(users);
  } catch (err) {
    console.error('Error fetching user data:', err);
    res.status(500).send('Error fetching user data');
  }
});

async function recommendRecipes() {
  try {
    const users = await UserInfo.find();
    console.log('Users:', users)

    for (const userData of users) {
      const prompt = `Please recommend 7 recipes, one for each day of the week, that meet the following preferences:
      - Gender: ${userData.gender}  
      - Age: ${userData.age}
      - Weight: ${userData.weight} lbs  
      - Height: ${userData.height} inches
      - Goal: ${userData.fitness_goal} 
      - Diet: ${userData.diet_type}
      
      For each recipe, include the:
      -breakFast,Lunch,Supper for each day of the week
      -letthe recipees be African Based on natural food
      - Recipe name
      - Ingredient list with quantities and units 
      - Step-by-step instructions
      - Health benefits      
    `;

      try {
        // Call OpenAI API with optimized parameters (example, adjust as needed)
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1500, 
            n: 7, 
            stop: null,
            temperature: 0.7,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.OA_API_KEY}`, // Use environment variable for security
            },
          }
        );

        const recommendedRecipes = response.data.choices.map((choice) => {
          const lines = choice.message.content.trim().split('\n');
          const recipeName = lines[0];
          const ingredients = [];
          const instructions = [];
          let currentSection = null;
        
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
        
            if (line.toLowerCase().startsWith('ingredients:')) {
              currentSection = 'ingredients';
            } else if (line.toLowerCase().startsWith('instructions:')) {
              currentSection = 'instructions';
            } else if (line) {
              if (currentSection === 'ingredients') {
                ingredients.push(line);
              } else if (currentSection === 'instructions') {
                instructions.push(line);
              }
            }
          }
        
          return {
            //user ID
            userId: userData._id.toString(),
            recipe: recipeName,
            ingredients,
            instructions,
          };
        });
      
  
        const recipesRef = db.collection('recipes').doc();
       // await recipesRef.set({ recipes: recommendedRecipes });
       await recipesRef.set({
       userId: userData._id.toString(), 
        recipes: recommendedRecipes,
      });
        console.log('Recipe recommendation successful', recommendedRecipes);
      } catch (error) {
        console.error('Error recommending recipes for user', userData._id, error.message);
      }
    }
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
  
/*
        await recipeSchema.updateOne(
          { _id: userData._id },
          { $set: { recommended_recipes: recommendedRecipes } }
        );

        console.log(`Recommended recipes updated for user ${userData._id}`);
      } catch (error) {
        console.error('Error recommending recipes for user', userData._id, error.message);
      }
    }
  } catch (error) {
    console.error('Error in recommendRecipes function:', error.message);
  }
}
*/


cron.schedule('*/2 * * * *', () => {
  console.log('Running recipe recommendation');
  recommendRecipes();
});

app.get('/api/recommended-recipes', async (req, res) => {
  try {
    const recipesSnapshot = await db.collection('recipes').get();
    const recommendedRecipes = [];

    recipesSnapshot.forEach((doc) => {
      const recipeData = doc.data();
      if (recipeData.recipes) {
        recommendedRecipes.push({ id: doc.id, recipes: recipeData.recipes });
      }
    });

    console.log('Recommended recipes:', recommendedRecipes);
    res.json(recommendedRecipes);
  } catch (error) {
    console.error('Error fetching recommended recipes:', error.message);
    res.status(500).send('Error fetching recommended recipes');
  }
});

// API endpoint to fetch recipes
app.get('/api/recipes', async (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;
    const snapshot = await db.collection('recipes')
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .limit(parseInt(limit)) 
      .get();

    const recipes = [];
    snapshot.forEach(doc => {
      const userId = doc.data().userId;
      recipes.push({ id: doc.id, ...doc.data() });
    });

    res.json(recipes);
  } catch (error) {
    console.log(error);
    res.status(500).send('Error getting recipes');
  }
});

// API endpoint to download report
app.get('/api/download-report', async (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;
    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);
    console.log('Limit:', limit);

    const snapshot = await db.collection('recipes')
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .limit(parseInt(limit))
      .get();

    const recipes = [];
    snapshot.forEach(doc => {
      recipes.push({ id: doc.id, ...doc.data() });
    });

    console.log('Recipes:', recipes);

    // Generate report data
    const reportData = generateReport(recipes);
    console.log('Report data:', reportData);

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=recipes-report.csv');

    // Convert report data to CSV format
    const csvData = reportData.map(recipe => Object.values(recipe).join(',')).join('\n');

    // Send report file
    res.status(200).send(csvData);
  } catch (error) {
    console.log(error);
    res.status(500).send('Error getting recipes report');
  }
});

// Generate report data
function generateReport(recipes) {
  return recipes.flatMap(recipe => {
    const { userId, recipes: recipeList } = recipe;
    return recipeList.map(r => ({
      user: userId,
      recipe: r.recipe,
      ingredients: r.ingredients.join(', '),
      instructions: r.instructions.join(', '),
    }));
  });
}


mongoose.connection.once('open',()=>{
  console.log(`Connected Successfully to the Database: ${mongoose.connection.name}`)
  app.listen(port, () => {
    console.log(`app is running at localhost:${port}`);
  });
  })

/*const express = require('express');
const mysql = require('mysql'); 
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "baro"
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err);
  } else {
    console.log('Connected to MySQL database');
  }
});

app.post('/api/user-data', (req, res) => {
  // Log the user payload
  console.log("User Payload:", req.body);

  const {
    gender,
    age,
    diet_type,
    activity_lifestyle,
    medical_history,
    medical_details,
    medical_details_choice,
    weight,
    height,
    fitness_goal,
  } = req.body;

  const sql = "INSERT INTO cas (gender, age, diet_type, activity_lifestyle, medical_history, medical_details, medical_details_choice, weight, height, fitness_goal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  const values = [gender, age, diet_type, activity_lifestyle, medical_history, medical_details, medical_details_choice, weight, height, fitness_goal];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error storing user data:', err);
      res.status(500).send('Error storing user data');
    } else {
    //  console.log("User created:", result);

      // Construct user details object
      const userDetails = {
        id: result.insertId,
        gender,
        age,
        diet_type,
        activity_lifestyle,
        medical_history,
        medical_details,
        medical_details_choice,
        weight,
        height,
        fitness_goal
      };
      app.get('/api/user-data', (req, res) => {
        db.query("SELECT * FROM users", (err, result) => {
          if (err) {
            console.error('Error getting user data:', err);
            res.status(500).send('Error getting user data');
          } else {
            console.log("User data:", result);
            return res.status(200).json({ message: "User data retrieved successfully", users: result });
          }
        }
      )})
      
       console.log("User created:", userDetails);
      return res.status(201).json({ message: "User created successfully", user: userDetails });  
    }
  });
});


const PORT = process.env.PORT || 8082;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
*/
