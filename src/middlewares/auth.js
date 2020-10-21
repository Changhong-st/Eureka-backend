require('express-async-errors');
const { signJWT, verifyJWT } = require('./../utils/jwt');

const auth = async ( req, res, next ) => {
  const token = req.header('X-Auth-Token');

  if (!token) {
    return res.status(401).json('No token, authorization denied');
  }

  try {
    const decoded = await verifyJWT(token);
    req.user = decoded.user;
    const tokenToSend = (await signJWT(decoded.user)).toString();
    res.setHeader('X-Auth-Token', tokenToSend);
    next();
  } catch (error) {
    if (error.message == 'invalid token') {
      return res.status(403).json('You are not authorized');
    } else
    throw error;
  };
};

module.exports = auth;

