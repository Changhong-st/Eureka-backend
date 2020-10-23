const User = require('./../models/User');
const { encryptPassword, comparePassword } = require('../utils/password');
const { signJWT } = require('../utils/jwt');
const { signUpSchema, logInSchema } = require('../utils/validator');
const HttpError = require('../utils/HttpError');
const { findById } = require('./../models/User');

const getUsers = async (req, res) => {
  const users = await User.find().exec();
  if (!users) {
    return res.status(400).json('Users not found');
  }
  return res.json(users);
};

const getUserById = async (req, res) => {
  const id = req.params.id;
  const user = await User.findById(id).exec();
  if (!user) {
    return res.status(400).json('User not found');
  }
  return res.json(user);
};


// User register
// Public

const signUp = async (req, res) => {
  const result = await signUpSchema.validateAsync(req.body, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true,
  });

  const { firstName, lastName, email, password } = result;

  const existingUser = await User.findOne({email}).exec();
  if (existingUser) {
    return res.json('User exists, please try another email');
  }

  const user = new User({ firstName, lastName, email, password });
  user.password = await encryptPassword(password);
  await user.save();

  const userId = user.id;
  const token = await signJWT({ userId, firstName, lastName, email });
  return res.set('X-Auth-Token', token).status(200).json({message: 'SignUp Succeed'})
};


// User login
// Public

const logIn = async(req, res) => {
  const result = await logInSchema.validateAsync(req.body, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true,
  });

  const { email, password } = result;
  const user = await User.findOne({email}).exec();
  if (!user) {
    return res.json('Incorrect email or password');
  }

  const encryptedPassword = user.password;
  const isPasswordMatch = await comparePassword(password, encryptedPassword);
  if (!isPasswordMatch) {
    return res.json('Incorrect email or password');
  }

  const userId = user.id;
  const { firstName, lastName } = user;
  const token = await signJWT({ userId, firstName, lastName, email });
  return res.header('X-Auth-Token', token).json({message: 'LogIn Succeed'})
};

// User private route demo
// Private
// 以下代码为写auth middleware时的demo，可修改或废弃

const updateUser = async (req, res) => {
  const id = req.params.id;

  const { email, password } = req.body;

  if (req.user.userId.toString() !== id.toString()) {
    return res.json('You are not authorized');
  }

  const updatedUser = await User.findByIdAndUpdate(
    id,
    {email, password},
    {new: true}
  ).exec();

  if (!updatedUser) {
    return res.status(400).json('Update user failed');
  }
  return res.json(updatedUser);
};

const updateUserName = async (req, res) => {
  const { userId } = req.user;
  const { firstName, lastName } = req.body;
  let user = await User.findById(userId).exec();

  if (!user) {
    throw new HttpError(400, 'user not found');
  }

  Object.assign(user, {
    firstName,
    lastName,
  }, { new: true })

  const updatedUserName = await user.save();

  if (!updatedUserName) {
    throw new HttpError(406, 'update user name faild');
  }
  const { email } = user;

  const token =  await signJWT({ userId, firstName, lastName, email });
  return res.status(202).header('X-Auth-Token', token).json({
    firstName: updatedUserName.firstName,
    lastName: updatedUserName.lastName,
  });
}

const resetPassword = async (req, res) => {
  const { userId } = req.user;
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(userId).exec();
  const passwordMatch = await comparePassword(currentPassword, user.password);

  if (!passwordMatch) {
    throw new HttpError('406', 'password not match');
  }

  const newEncryptedPassword = await encryptPassword(newPassword);
  // const updatedUser = await user.updateOne({
  //   password: newEncryptedPassword,
  // }, {new: true});
  //以上方法不支持使用 new: true，所以我打算用commonJS原生写法保存
  Object.assign(user, {
    password: newEncryptedPassword,
  }, { new: true });
  
  const updatedUser = await user.save();

  if (!updatedUser) {
    throw new HttpError(406, 'could not reset password')
  }
  res.status(202).json(updatedUser);
}

module.exports = { 
  getUsers,
  getUserById,
  signUp,
  logIn,
  updateUser,
  updateUserName,
  resetPassword,
};
