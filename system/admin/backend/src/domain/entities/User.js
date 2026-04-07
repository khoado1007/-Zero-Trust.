/**
 * Domain Entity: Immutable User (Employee) representation
 */
class User {
  constructor({
    id,
    employeeId,  // Business ID: NV001
    fullName,
    email,
    department = 'SALES',
    role = 'EMPLOYEE'
  }) {
    this.id = id;
    this.employeeId = employeeId;
    this.fullName = fullName;
    this.email = email;
    this.department = ['SALES', 'SOCIAL'].includes(department) ? department : 'SALES';
    this.role = ['ADMIN', 'EMPLOYEE'].includes(role) ? role : 'EMPLOYEE';

    this.validate();
  }

validate() {
    if (!this.employeeId || typeof this.employeeId !== 'string') {
      throw new Error('employeeId is required');
    }
    if (!this.fullName || typeof this.fullName !== 'string') {
      throw new Error('fullName is required');
    }
    if (!this.email || !this.email.includes('@')) {
      throw new Error('Valid email is required');
    }
  }

  // Business Methods
  assignToDevice(device) {
    return device; // Validate dept alignment later
  }

  updateDetails(fullName, department) {
    return new User({
      id: this.id,
      employeeId: this.employeeId,
      fullName,
      email: this.email,
      department,
      role: this.role
    });
  }
}

module.exports = User;
}
}

