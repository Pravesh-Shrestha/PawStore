import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import users from "./data/users";
import breeds from "./data/breeds";
import accessories from "./data/accessories";
import blogs from "./data/blogs";
import User from "./models/userModel";
import Breed from "./models/breedModel";
import Accessory from "./models/accessoryModel";
import Blog from "./models/blogModel";
import Contact from "./models/contactModel";
import dbConnect from "./database/db";

// Connect to database
dbConnect();

// Import data
const importData = async () => {
  try {
    // Clear all collections
    await User.deleteMany();
    await Breed.deleteMany();
    await Accessory.deleteMany();
    await Blog.deleteMany();
    await Contact.deleteMany();

    // Insert data
    const createdUsers = await User.insertMany(users);
    const adminUser = createdUsers[0]._id;

    const sampleBreeds = breeds.map((breed) => {
      return { ...breed };
    });

    const sampleAccessories = accessories.map((accessory) => {
      return { ...accessory };
    });

    const sampleBlogs = blogs.map((blog) => {
      return { ...blog };
    });

    await Breed.insertMany(sampleBreeds);
    await Accessory.insertMany(sampleAccessories);
    await Blog.insertMany(sampleBlogs);

    console.log("Data Imported!");
    process.exit();
  } catch (error) {
    console.error(`Error: ${(error as any).message}`);
    process.exit(1);
  }
};

// Destroy data
const destroyData = async () => {
  try {
    // Clear all collections
    await User.deleteMany();
    await Breed.deleteMany();
    await Accessory.deleteMany();
    await Blog.deleteMany();
    await Contact.deleteMany();

    console.log("Data Destroyed!");
    process.exit();
  } catch (error) {
    console.error(`Error: ${(error as any).message}`);
    process.exit(1);
  }
};

// Check command line argument
if (process.argv[2] === "-d") {
  destroyData();
} else {
  importData();
}

