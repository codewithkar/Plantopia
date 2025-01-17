const getShop = (req, res) => {
    res.render('user/shop');
}

const getSignin = (req, res) => {
    res.render('user/signup');
}
export default { getShop}