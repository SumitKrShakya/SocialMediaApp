const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cripto = require('crypto')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please enter a name."]
    },
    avatar: {
        public_id: String,
        url: String
    },
    email: {
        type: String,
        required: [true, 'Please enter an email.'],
        unique: [true, 'Email already exists.'],
    },
    password: {
        type: String,
        required: [true, "Please enter a password."],
        minlength: [6, "Password must be at least 6 characters long."],
        select: false
    },
    posts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
    }],
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",

    }],
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    resetPasswordToken: String,
    resetPasswordExpire: Date

})

userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10)
    }
    next()
})

userSchema.methods.matchPasswords = async function(password) {
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateToken = async function() {
    return jwt.sign({ _id: this._id }, process.env.JWT_SECRET)
}

userSchema.methods.getResetPasswordToken = async function() {
    const resetToken = cripto.randomBytes(20).toString('hex')
    this.resetPasswordToken = cripto.createHash('sha256').update(resetToken).digest('hex')
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000
    return resetToken
}

module.exports = mongoose.model('User', userSchema)