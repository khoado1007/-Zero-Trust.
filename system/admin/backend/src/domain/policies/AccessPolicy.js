/**
 * Abstract Policy for department-specific access rules (OCP)
 */
class AccessPolicy {
  getToleranceLimit() {
    throw new Error('Must implement getToleranceLimit()');
  }

  getName() {
    throw new Error('Must implement getName()');
  }
}

class SalesAccessPolicy extends AccessPolicy {
  getToleranceLimit() {
    return 1; // Strict for SALES
  }
  
  getName() {
    return 'SALES';
  }
}

class SocialAccessPolicy extends AccessPolicy {
  getToleranceLimit() {
    return 3; // Lenient for SOCIAL
  }
  
  getName() {
    return 'SOCIAL';
  }
}

function getPolicyForDepartment(department) {
  switch (department) {
    case 'SOCIAL': return new SocialAccessPolicy();
    case 'SALES': 
    default: return new SalesAccessPolicy();
  }
}

module.exports = {
  AccessPolicy,
  SalesAccessPolicy,
  SocialAccessPolicy,
  getPolicyForDepartment
};

