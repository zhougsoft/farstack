# farstack

- basic node/express/react starter
- uses the [Farcaster AuthKit](https://docs.farcaster.xyz/auth-kit/introduction) for logging in w/ farcaster

### requirements
- yarn

### setup
1. install dependencies: `yarn`
1. make a copy of the server .env file: `cp server/.env.example server/.env`
    - *optional:* update the `JWT_SECRET` var to something secure 
1. run **server** *(port 6969)*: `yarn server`
1. run **client** *(port 5173)*: `yarn client`
1. go to [http://localhost:5173](http://localhost:5173)
1. !!!
