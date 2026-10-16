import moongoose from "mongoose";

const userSchema = new moongoose.Schema({
  name: {type: String, required: true, trim: true},
  email: {type: String, required: true, unique: true,trim: true, lowercase: true},
  password: {type: String, required: true, minlength: 6, select: false},
  role: {type: String, enum: ["admin", "employee"], default: "employee"},
  isActive: {type: Boolean, default: true},
},{timestamps: true});

const User = moongoose.model("User", userSchema);

export default User;