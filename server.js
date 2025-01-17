import express from "express";
import session from 'express-session';
import nocache from "nocache";
import adminRoutes from "./router/adminRoutes.js"
import userRoutes from "./router/userRoutes.js"
import connectDB from './connections/dbConfig.js';
import dotenv from 'dotenv';
import passport from "passport";
import './utils/googleAuth.js';

dotenv.config();
connectDB();


const app = express();

app.set('view engine', 'ejs');

//! Middleware

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(nocache());



// Express session
app.use(session({
    secret: 'mySecret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
  }));

app.use(passport.initialize())
app.use(passport.session())


//! Routes
app.use('/admin', adminRoutes);
app.use('/', userRoutes);




//! listening server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});