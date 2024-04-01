# Yet Another Blog

Yet Another Blog (YAB) is a self-hosted blogging service made to be quick to set up and easy to use. YAB is currently in alpha and breaking changes happen frequently.

**YAB is not currently recommended for production environments.**

# Installation

## Clone the repository

Note, this software is currently in alpha, you need to clone the "alpha" branch in order to use the software in its current state.

```bash
git clone -b alpha https://github.com/Armored-Dragon/yet-another-blog
```

## Move into the repository directory

```bash
cd yet-another-blog
```

## Edit the .env file

The `template.env` file is a complete template of all valid values. As a template, there are few prefilled values, and those that are prefilled are done so that YAB will preform as expected.

```bash
cp template.env .env # Copy the template.env file into a regular .env file
nano .env # Replace "nano" with any other text editor of your choice
```

Replace `BASE_URL` with your domain name for your blog.

Replace the `S3_*` variable values with the correct information to be able to upload images to your bucket.
Media uploads will not work without an S3 bucket.

Please change the `POSTGRES_PASSWORD` value to a secure password.

## Run docker-compose

```bash
docker-compose up
```

## Create an administrator account

The first account created will be created with administrator privileges, so it is important to create your account immediately after installation. YAB will use port `5004` by default, so visit your instance by navigating to `http://localhost:5004`.

## Administrator panel

You can visit the administrator panel by visiting `http://localhost:5004/admin`
