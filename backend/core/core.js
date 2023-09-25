const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const crypto = require("crypto");
const sharp = require("sharp");
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsCommand, DeleteObjectsCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
});
const settings = require("../settings");

async function registerUser(username, password, options) {
  const new_user = await prisma.user.create({ data: { username: username, password: password, ...options } });
  await settings.setSetupComplete();
  if (new_user) return { success: true, message: `Successfully created ${new_user.username}` };
}

async function getUser({ id, username } = {}) {
  if (id || username) {
    let user;
    if (id) user = await prisma.user.findUnique({ where: { id: id } });
    else if (username) user = await prisma.user.findUnique({ where: { username: username } });

    if (!user) return { success: false, message: "No matching user" };
    else return { success: true, data: user };
  }
}

module.exports = { registerUser, getUser };
