const express = require('express')
const path = require('path')
const bcrypt = require('bcrypt')
const app = express()
let db = null
const dbPath = path.join(__dirname, 'userData.db')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
app.use(express.json())

const initilize = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
  } catch (e) {
    console.log(`DB Error : ${e.message}`)
    process.exit(1)
  }
}
initilize()

const validatePassword = password => {
  return password.length > 4
}
// USER REGISTER API
app.post('/register', async (request, response) => {
  let {username, name, password, gender, location} = request.body //Destructuring the data from the API call

  let hashedPassword = await bcrypt.hash(password, 10) //Hashing the given password

  let checkTheUsername = `
            SELECT *
            FROM user
            WHERE username = '${username}';`
  let userData = await db.get(checkTheUsername) //Getting the user details from the database
  if (userData === undefined) {
    //checks the condition if user is already registered or not in the database
    /*If userData is not present in the database then this condition executes*/
    let postNewUserQuery = `
            INSERT INTO
            user (username,name,password,gender,location)
            VALUES (
                '${username}',
                '${name}',
                '${hashedPassword}',
                '${gender}',
                '${location}'
            );`
    if (password.length < 5) {
      //checking the length of the password
      response.status(400)
      response.send('Password is too short')
    } else {
      /*If password length is greater than 5 then this block will execute*/
      let newUserDetails = await db.run(postNewUserQuery) //Updating data to the database
      response.status(200)
      response.send('User created successfully')
    }
  } else {
    /*If the userData is already registered in the database then this block will execute*/
    response.status(400)
    response.send('User already exists')
  }
})

app.post('/login', async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = 'SELECT * FROM user WHERE username = ?';
  const user = await db.get(selectUserQuery, [username]);

    if (user===undefined) {
      // User does not exist
      response.status(400).send('Invalid user');
      return;
    }

    // Compare the provided password with the hashed password in the database
    const isPasswordMatched = await bcrypt.compare(password, user.password);

    if (isPasswordMatched) {
      // Passwords match, login successful
      response.send('Login success!');
    } else {
      // Passwords do not match
      response.status(400).send('Invalid password');
    }
});

app.put('/change-password', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body
  const selectUserQuery = `SELECT * FROM user WHERE username = ?`
  const user = await db.get(selectUserQuery, [username])

  if (user === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(oldPassword, user.password)
    if (isPasswordMatched) {
      if (validatePassword(newPassword)) {
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        const updateNewPasswordQuery = `UPDATE user SET password = '${hashedPassword}' WHERE username = '${username}'`
        await db.run(updateNewPasswordQuery)
        response.send('Password updated')
      } else {
        response.status(400)
        response.send('Password is too short')
      }
    } else {
      response.status(400)
      response.send('Invalid current password')
    }
  }
})
module.exports = app
