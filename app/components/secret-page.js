import Component from '@ember/component';
import Ember from 'ember';

export default Component.extend({
  authManager: Ember.inject.service('session')
});
