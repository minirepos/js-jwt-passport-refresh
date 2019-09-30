const { ApolloServer, gql, AuthenticationError } = require('apollo-server-express')
const cors = require('cors')
const express = require('express')
const jwt = require('jsonwebtoken')

const PORT = 8000
const JWT_SECRET = 'secret abcd hello'

const usersDb = [{ id: '7H5FtwuiIhepa9', name: 'Sven', email: 'sven@example.com' }]

const app = express()

const requireAuth = fn => (obj, args, context, info) => {
  if (!context.user) throw new AuthenticationError('Not authenticated')
  return fn(obj, args, context, info)
}

const apolloServer = new ApolloServer({
  typeDefs: gql`
    type User {
      id: ID!
      name: String!
      email: String!
    }
    type Query {
      login(email: String!): String!
      public: String!
      me: User!
    }
  `,
  resolvers: {
    Query: {
      public: () => 'public',
      login: (_, { email }) => {
        const user = usersDb.find(u => u.email === email)
        if (!user) throw new AuthenticationError('Cannot find user')
        return jwt.sign({ sub: user.id }, JWT_SECRET)
      },
      me: requireAuth((_, __, { user }) => {
        if (user) return user
      }),
    },
  },
  context: ({ req }) => {
    if (!req.headers.authorization) return {}
    let userId
    try {
      userId = jwt.verify(req.headers.authorization.split('Bearer ')[1], JWT_SECRET).sub
    } catch {
      throw new AuthenticationError('Invalid token')
    }
    const user = usersDb.find(u => u.id === userId)
    if (!user) throw new AuthenticationError('No user for this token')
    return { user }
  },
})

// Change the origin for staging / production
app.use(cors({ origin: 'http://localhost:3000', credentials: true }))

apolloServer.applyMiddleware({ app, cors: false })

app.listen(PORT, () => console.log(`API listening on port ${PORT}`))
