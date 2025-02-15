const getAdmin = (req, res) => {
    res.render('admin/login');
}

const postAdmin = async (req, res) => {
   // console.log('Admin Email:', process.env.ADMIN_EMAIL); 
    const { email, password } = req.body;
    
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
        console.error('Environment variables not loaded');
        return res.status(500).send('Server configuration error');
    }

    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        res.redirect('/admin/dashboard');
    } else { 
        res.render('admin/login');
    }
}

const getDashboard = (req, res) => {
    res.render('admin/dashboard');
}

const getLogout = (req, res) => {
    if (req.session.isAdmin) {
  
        req.session.isAdmin = null;
        res.redirect('/admin/login');
    } else {
        res.redirect('/admin/login');
    }
};


export default { getAdmin,postAdmin,getDashboard,getLogout}; // Add  getUserList, getToggle to export