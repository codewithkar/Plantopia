import express from "express";
import session from 'express-session';
import nocache from "nocache";
import adminRoutes from "./router/adminRoutes.js"
import userRoutes from "./router/userRoutes.js"
import connectDB from './connections/dbConfig.js';
import dotenv from 'dotenv';
import passport from "passport";
import './utils/googleAuth.js';
import cartWishlistCountMiddleware from './utils/cartWishlistCount.js';
import helmetMiddleware from "./middlewares/helmetMiddleware.js";
import cors from 'cors';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';

dotenv.config();
connectDB();


const app = express();

app.set('view engine', 'ejs');

//! Middleware
app.use(cors({ origin: "*" })); // Allow all origins (for testing)
app.use(helmetMiddleware);
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(nocache());

const accessLogStream = fs.createWriteStream(path.join(process.cwd(), 'access.log'), { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream })); 
app.use(morgan('dev')); 

// Express session
app.use(session({
    secret: 'mySecret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
  }));

app.use(cartWishlistCountMiddleware);
app.use(passport.initialize())
app.use(passport.session())


//! Routes
app.use('/admin', adminRoutes);
app.use('/', userRoutes);

app.get('/cart-wishlist-count', (req, res) => {
  res.json({ cartCount: res.locals.cartCount, wishlistCount: res.locals.wishlistCount });
});


//! listening server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

