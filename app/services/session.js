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
