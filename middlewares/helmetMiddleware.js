import helmet from "helmet";

const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "http://localhost:3000",
        "https://localhost:3000",  // Added HTTPS localhost
        "http://*", 
        "https://checkout.razorpay.com",
        "https://cdnjs.cloudflare.com",
        "https://cdn.jsdelivr.net",
        "https://apis.google.com",
        "https://accounts.google.com",
        "https://*.googleusercontent.com",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "'unsafe-hashes'", // Added this
        "https://*.razorpay.com",
        "https://checkout-static.razorpay.com",
        "https://cdn.razorpay.com"
      ],
      scriptSrcAttr: [
        "'unsafe-inline'",  // Allow inline event handlers
        "'unsafe-hashes'"   // Allow hashed event handlers
      ],
      workerSrc: ["'self'", "blob:", "https://*.razorpay.com"],
      childSrc: ["'self'", "blob:", "https://*.razorpay.com"],
      frameSrc: [
        "'self'",
        "https://api.razorpay.com",
        "https://checkout.razorpay.com",
        "https://accounts.google.com",
        "https://content.googleapis.com",
        "https://*.razorpay.com"
      ],
      imgSrc: [
        "'self'", 
        "data:", 
        "https:", 
        "https://*.razorpay.com",
        "https://*.googleusercontent.com",
        "https://lh3.googleusercontent.com",
        "blob:"
      ],
      connectSrc: [
        "'self'",
        "https://api.razorpay.com",
        "https://checkout.razorpay.com",
        "https://lumberjack.razorpay.com",
        "https://*.razorpay.com",
        "https://accounts.google.com",
        "https://*.googleapis.com",
        "wss://*.razorpay.com"
      ],
      styleSrc: [
        "'self'",
        "http://localhost:3000",  // Added HTTP localhost
        "https://localhost:3000", // Added HTTPS localhost
        "http://*",  
        "'unsafe-inline'",
        "https://checkout.razorpay.com",
        "https://*.razorpay.com",
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com"
      ],
      fontSrc: [
        "'self'", 
        "data:", 
        "https://*.razorpay.com",
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com"
      ],
      formAction: [
        "'self'", 
        "https://*.razorpay.com",
        "https://accounts.google.com"
      ],
      baseUri: ["'self'"],
      objectSrc: ["'none'"]
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "unsafe-none" }
//   hsts: false  // Disable HSTS during development
});

export default helmetMiddleware;