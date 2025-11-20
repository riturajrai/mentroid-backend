
const express = require('express');
const VerfyCookiesRouter =  express.Router();
const jwt = require('jsonwebtoken');

VerfyCookiesRouter.get('/verify-token', async (req, res, next)=>{
    try{
        const token = req.cookies.token
        if(!token){
            return res.status(400).json({message: "Anauthrorized"})
        }
        const decoded = jwt.verify(token ,  process.env.JWT_SECRET);
        req.user = decoded;
        res.status(200).json({message: "Token Verifyed succesfully" , user: decoded , suceess: true})
    }catch(error){
        console.log(error)
        res.status(402).json({message: "Somethings Wrongs in Ypur Code"});   
    }
})
module.exports = VerfyCookiesRouter;