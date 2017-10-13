# Real-world Authentication with Ember Simple Auth

Getting authentication up and running in Ember can be overwhelming.

Now that we understand how Services and token-based authentication work,
we are ready to get started with a simple –yet powerful– framework
called Ember Simple Auth.

## Start application

Our sample app will be called `ember-authentication-esa`.

```
ember new ember-authentication-esa

ember install ember-simple-auth

ember g route secret --path "/"
ember g route login
ember g route application

ember g component secret-page
ember g component login-page

ember g model code description:string

ember g adapter application
```

edit `.ember-cli`:

```
{
  "liveReload": true,
  "watcher": "polling",
  "disableAnalytics": false
}
```

then upgrade all packages: `ncu; ncu -u; npm install`

Done?

The next step is to include our `secret-page` component in the
`secret.hbs` template. Basically, the template will be used as a shim
layer, where by we only use templates to include a “top-level” component.

```
{{! app/templates/secret.hbs }}
{{secret-page model=model}}
```

And proceed to build our secret list:

```
{{! app/templates/components/secret-page.hbs }}
{{#if authManager.currentUser}}
  Logged in as {{authManager.currentUser.email}}
{{/if}}

<h1>Hello Simple Auth!</h1>

<ul>
  {{#each model as |code|}}
    <li><strong>{{code.description}}</strong></li>
  {{/each}}
</ul>
```

Cool, but we have no actual data yet to show!

## Loading backend data

We will create a very simple and quick backend server.

```
ember generate server
npm install
npm install body-parser --save-dev
ncu
ncu -u
npm install
```

Great. We now open `server/index.js` and make it look exactly like this:

```
'use strict';

const bodyParser = require('body-parser');

module.exports = function(app) {
  app.use(bodyParser.urlencoded({ extended: true }));

  app.get('/api/codes', function (req, res) {

    if (req.headers['authorization'] !== "Bearer some bs") {
      return res.status(401).send('Unauthorized');
    }

    // {"data":[{"id":"1","type":"codes","attributes":{"description":"Bitcoin keeps hitting record highs"}}]}
    return res.status(200).send({
      "data": [{
        "type": "codes",
        "id": "1",
        "attributes": {
          "description": "Bitcoin keeps hitting record highs"
        },
      },{
        "type": "codes",
        "id": "2",
        "attributes": {
          "description": "Jamie Dimon doesn’t want to talk about it"
        }
      }]
    });
  });

  app.post('/token', function(req, res) {
    if (req.body.username == 'login' && req.body.password == 'password') {
      res.send({ access_token: "some bs" });
    } else {
      res.status(400).send({ error: "invalid_grant" });
    }
  });
};
```

All ready now to load them in our route’s `model()` hook!

```
// app/routes/secret.js
import Route from '@ember/routing/route';
import AuthenticatedRouteMixin from 'ember-simple-auth/mixins/authenticated-route-mixin';

export default Route.extend(AuthenticatedRouteMixin, {
  model() {
    return this.store.findAll('code');
  }
});
```

The challenge now is to create the user flow. Same as with `secret-page`
we must create the shim layer for `login`:

```
{{! app/templates/login.hbs }}
{{login-page}}
```

To recap: app displays nuclear missile activation codes only to logged
in users. It requests an OAuth2 token from a small embedded web server
in order to show the codes.

The core concept in the authentication mechanism is the Ember Service.
In application we called it `authManager`. Ember Simple Auth (ESA) has
its own service, named `session`. We are going drop ours and use ESA’s –
but we’ll keep the `authManager` variable name.

Meanwhile, in the login page component…

```
{{! app/components/login-page.js }}
import Component from '@ember/component';
import Ember from 'ember';

export default Component.extend({

  authManager: Ember.inject.service('session'),

  actions: {
    authenticate() {
      const { login, password } = this.getProperties('login', 'password');
      this.get('authManager').authenticate('authenticator:oauth2', login, password).then(() => {
        alert('Success! Click the top link!');
      }, (err) => {
        alert('Error obtaining token: ' + err.responseText);
      });
    }
  }
});
```

(Note that we are now passing in an Authenticator,
authenticator:oauth2.)

```
{{! app/templates/components/login-page.hbs }}
{{#if authManager.currentUser}}
  Logged in as {{authManager.currentUser.email}}
{{ else }}
  <h2>Login page</h2>
  <p>Use login / password</p>

  <form {{action 'authenticate' on='submit'}}>
    {{input value=login placeholder='Login'}}<br>
    {{input value=password placeholder='Password' type='password'}}<br>
    <button type="submit">Login</button>
  </form>
{{/if}}

<br>

{{#link-to 'secret'}}<strong>Secret page under token</strong>{{/link-to}}
```

An `Authenticator` is defined by ESA as:

The authenticator authenticates the session. The actual mechanism used
to do this might e.g. be posting a set of credentials to a server and in
exchange retrieving an access token, initiating authentication against
an external provider like Facebook etc. and depends on the specific
authenticator.

So let’s create our OAuth2 authenticator:

```
mkdir app/authenticators
touch app/authenticators/oauth2.js
```

With the following content:

```
import OAuth2PasswordGrant from 'ember-simple-auth/authenticators/oauth2-password-grant';

export default OAuth2PasswordGrant.extend();
```

This strategy effectively replaces our `Ember.$.ajax` call to fetch the
token at `/token`! All the heavy work is now done by Ember Simple Auth!

If you needed to override the token endpoint, here’s how:

```
// app/authenticators/oauth2.js
export default OAuth2PasswordGrant.extend({
  serverTokenEndpoint: "/path/to/token"
});
```

At the moment, if no token is available when the `secret` route is
accessed, a `401 Unauthorized` error will be thrown (you can probably
notice it in your console). This will happen during the `findAll` call
to the backend.

By mixing in `AuthenticatedRouteMixin` we get that check for free:

```
// app/routes/secret.js
import Route from '@ember/routing/route';
import AuthenticatedRouteMixin from 'ember-simple-auth/mixins/authenticated-route-mixin';

export default Route.extend(AuthenticatedRouteMixin, {
  model() {
    return this.store.findAll('code');
  }
});
```

The application route was used to catch those errors and transition to
the `login` route. With ESA, we simply mix in `ApplicationRouteMixin`
and it will be handled for us.

```
// app/routes/application.js
import Route from '@ember/routing/route';
import ApplicationRouteMixin from 'ember-simple-auth/mixins/application-route-mixin';

export default Route.extend(ApplicationRouteMixin);
```

Finally, the application adapter had the `authManager` injected and sent
an `Authorization` header. Again, ESA takes care of this for us:

```
// app/adapter/application.js
import DS from 'ember-data';
import DataAdapterMixin from 'ember-simple-auth/mixins/data-adapter-mixin';

export default DS.JSONAPIAdapter.extend(DataAdapterMixin, {
  namespace: 'api',
  authorizer: 'authorizer:application'
});
```

Which brings us to `Authorizers`. What are they?

Authorizers use the session data aqcuired by an authenticator when
authenticating the session to construct authrorization data that can
e.g. be injected into outgoing network requests etc. Depending on the
authorization mechanism the authorizer implements, that authorization
data might be an HTTP header, query string parameters, a cookie etc.

In order to replace our `Authorization: Bearer "some token"` header, we
will leverage ESA’s `OAuth2Bearer` authorizer. Let’s create:

```
mkdir app/authorizers
touch app/authorizers/application.js
```

With…

```
// app/authorizers/application.js
import OAuth2Bearer from 'ember-simple-auth/authorizers/oauth2-bearer';

export default OAuth2Bearer.extend();
```

That’s it for the upgrade!

If we restart `ember server` and check it out… the application behaves
exactly the same! (Except it’s much more solid.) We are now delegating a
great deal of complexity to Ember Simple Auth!

## Set the current user

Those of us familiar with Devise (the Rails authentication solution)
will recall the `current_user` variable available to Rails’ controllers.

We know a user has authenticated when the `isAuthenticated` property
becomes `true`. The plan is to fetch the current user whenever that
happens.

Let’s whip up a custom `session` service (as well as a `User` model to
represent our user):

```
ember g service session
ember g model user email:string
```

We will extend ESA’s `Session` service and add a (computed) property
called `currentUser`:

```
// app/services/session.js
import ESASession from "ember-simple-auth/services/session";
import Ember from 'ember';
import DS from 'ember-data';

export default ESASession.extend({
  store: Ember.inject.service(),

  currentUser: Ember.computed('isAuthenticated', function() {
    if (this.get('isAuthenticated')) {
      // For RESTAdapter
      // const promise = this.get('store').queryRecord('user', {})

      // For JSONAPIAdapter
      const promise = this.get('store').query('user', { email: 'test@example.com' }).then(function(result) {
        return result.objectAt(0);
        // return result.get('firstObject');
      });

      // const promise = this.get('store').query('user', {filter:{email : 'test@example.com'}}).then(function(result){
      //   return result.objectAt(0);
      //});

      return DS.PromiseObject.create({ promise: promise })
    }
  })
});
```

Since querying the backend for a user involves a promise, we return a
`PromiseObject` that will update our template when the promise resolves.

Neat! But… hold your horses! It’s not as if we had an API endpoint for
the current logged in user.

Typically this response depends on a cookie and a DB lookup. But let’s
quickly create a dummy response, which for now will live at `/api/users`

```
// server/index.js
'use strict';

const bodyParser = require('body-parser');

module.exports = function(app) {
  app.use(bodyParser.urlencoded({ extended: true }));

  app.get('/api/codes', function (req, res) {

    if (req.headers['authorization'] !== "Bearer some bs") {
      return res.status(401).send('Unauthorized');
    }

    // {"data":[{"id":"1","type":"codes","attributes":{"description":"Bitcoin keeps hitting record highs"}}]}
    return res.status(200).send({
      "data": [{
        "type": "codes",
        "id": "1",
        "attributes": {
          "description": "Bitcoin keeps hitting record highs"
        },
      },{
        "type": "codes",
        "id": "2",
        "attributes": {
          "description": "Jamie Dimon doesn’t want to talk about it"
        }
      }]
    });
  });

  app.post('/token', function(req, res) {
    if (req.body.username == 'login' && req.body.password == 'password') {
      res.send({ access_token: "some bs" });
    } else {
      res.status(400).send({ error: "invalid_grant" });
    }
  });

  // {"data":[{"id":"1","type":"users","attributes":{"email":"test@example.com"}}]}
  app.get('/api/users', function (req, res) {
    return res.status(200).send({
      "data": [{
        "type": "users",
        "id": "1",
        "attributes": {
          "email": "test@example.com"
        },
      },{
        "type": "users",
        "id": "2",
        "attributes": {
          "email": "demo@example.com"
        }
      },{
        "type": "users",
        "id": "3",
        "attributes": {
          "email": "lugatex@yahoo.com"
        }
      }]
    });
  });
};
```

It’s high time to make use of the feature! We will prepend a snippet to
the secret page:

```
{{! app/templates/components/secret-page.hbs }}
{{#if authManager.currentUser}}
  Logged in as {{authManager.currentUser.email}}
{{/if}}

<h1>Hello Simple Auth!</h1>

<ul>
  {{#each model as |code|}}
    <li><strong>{{code.description}}</strong></li>
  {{/each}}
</ul>
```

Naturally –you guessed it– we need to inject the service into our secret
page component:

```
// app/components/secret-page.js
import Component from '@ember/component';
import Ember from 'ember';

export default Component.extend({
  authManager: Ember.inject.service('session')
});
```

Loading our app, this is what we see:

Great, it works!

## [Ember Igniter Making Ember more effective by Frank Treacy][2]

### October 2017 Oleg G.Kapranov

[1]: https://emberigniter.com/implementing-authentication-with-ember-services/
[2]: https://emberigniter.com/real-world-authentication-with-ember-simple-auth
