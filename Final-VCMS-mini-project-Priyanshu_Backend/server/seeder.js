const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const Appointment = require('./models/Appointment');
const Prescription = require('./models/Prescription');
const Notification = require('./models/Notification');
const MedicalHistory = require('./models/MedicalHistory');
const { v4: uuidv4 } = require('uuid');

dotenv.config();
connectDB();

// utility to generate realistic random availability slots (1‑3 days/week)
function randomAvailability() {
  const days = [
    'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'
  ];
  const count = Math.floor(Math.random() * 3) + 1; // 1-3 days
  const avail = [];
  const used = new Set();
  while (avail.length < count) {
    const day = days[Math.floor(Math.random() * days.length)];
    if (used.has(day)) continue;
    used.add(day);
    // choose a start between 8 and 11, end 4-8 hours later
    const startHour = 8 + Math.floor(Math.random() * 4);
    const duration = 4 + Math.floor(Math.random() * 5); // 4-8 hours
    const endHour = startHour + duration;
    avail.push({
      day,
      startTime: `${String(startHour).padStart(2,'0')}:00`,
      endTime: `${String(endHour).padStart(2,'0')}:00`,
    });
  }
  return avail;
}

// sample helper data used for filling incomplete doctor profiles
const sampleLocations = [
  'Mumbai, Maharashtra',
  'Delhi, Delhi',
  'Bangalore, Karnataka',
  'Chennai, Tamil Nadu',
  'Hyderabad, Telangana',
  'Pune, Maharashtra',
  'Kolkata, West Bengal',
  'Ahmedabad, Gujarat',
  'Jaipur, Rajasthan',
];
function randomLocation() {
  return sampleLocations[Math.floor(Math.random() * sampleLocations.length)];
}
function randomExperience() {
  return 5 + Math.floor(Math.random() * 11); // 5-15 years
}
function randomFee() {
  return 300 + Math.floor(Math.random() * 501); // 300-800
}

const seed = async () => {
  try {
    console.log('Clearing existing data...');
    await Notification.deleteMany({});
    await Prescription.deleteMany({});
    await MedicalHistory.deleteMany({});
    await Appointment.deleteMany({});
    await User.deleteMany({});

    const hash = async (pw) => {
      const salt = await bcrypt.genSalt(10);
      return await bcrypt.hash(pw, salt);
    };

    console.log('Creating admin user...');
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@gmail.com',
      password: await hash('12345'),
      role: 'admin',
      phone: '1234567890',
      approvalStatus: 'approved',
      isActive: true,
    });
    console.log('✓ Admin created:', admin.email);

    console.log('Creating doctors...');
    const doctors = await User.create([
      {
        name: 'Iris Patel',
        email: 'iris.doctor@vcms.com',
        password: await hash('doctor123'),
        role: 'doctor',
        phone: '2001234575',
        specialization: 'Ophthalmology',
        experience: 13,
        location: 'Bangalore',
        consultationFee: 500,
        profileImage: 'https://via.placeholder.com/150',
        availability: randomAvailability(),
        approvalStatus: 'approved',
        isActive: true,
      },
      {
        name: 'James Khan',
        email: 'james.doctor@vcms.com',
        password: await hash('doctor123'),
        role: 'doctor',
        phone: '2001234576',
        specialization: 'ENT',
        experience: 10,
        location: 'Hyderabad',
        consultationFee: 420,
        profileImage: 'https://via.placeholder.com/150',
        availability: randomAvailability(),
        approvalStatus: 'approved',
        isActive: true,
      },
      {
        name: 'Karen Singh',
        email: 'karen.doctor@vcms.com',
        password: await hash('doctor123'),
        role: 'doctor',
        phone: '2001234577',
        specialization: 'Obstetrics & Gynecology',
        experience: 16,
        location: 'Chennai',
        consultationFee: 550,
        profileImage: 'https://via.placeholder.com/150',
        availability: randomAvailability(),
        approvalStatus: 'approved',
        isActive: true,
      },
      {
        name: 'Leo Sharma',
        email: 'leo.doctor@vcms.com',
        password: await hash('doctor123'),
        role: 'doctor',
        phone: '2001234578',
        specialization: 'Urology',
        experience: 12,
        location: 'Pune',
        consultationFee: 500,
        profileImage: 'https://via.placeholder.com/150',
        availability: randomAvailability(),
        approvalStatus: 'approved',
        isActive: true,
      },
      {
        name: 'Mona Desai',
        email: 'mona.doctor@vcms.com',
        password: await hash('doctor123'),
        role: 'doctor',
        phone: '2001234579',
        specialization: 'Oncology',
        experience: 17,
        location: 'Mumbai',
        consultationFee: 700,
        profileImage: 'https://via.placeholder.com/150',
        availability: [
          { day: 'Tuesday', startTime: '10:00', endTime: '18:00' },
          { day: 'Wednesday', startTime: '10:00', endTime: '18:00' },
          { day: 'Friday', startTime: '10:00', endTime: '18:00' },
        ],
        approvalStatus: 'approved',
        isActive: true,
      },
      {
        name: 'Nathan Verma',

        email: 'nathan.doctor@vcms.com',
        password: await hash('doctor123'),
        role: 'doctor',
        phone: '2001234580',
        specialization: 'Rheumatology',
        experience: 11,
        location: 'Delhi',
        consultationFee: 520,
        profileImage: 'https://via.placeholder.com/150',
        availability: [
          { day: 'Monday', startTime: '10:00', endTime: '18:00' },
          { day: 'Wednesday', startTime: '10:00', endTime: '18:00' },
          { day: 'Friday', startTime: '10:00', endTime: '18:00' },
        ],
        approvalStatus: 'approved',
        isActive: true,
      },
      {
        name: 'Olivia Roy',

        email: 'olivia.doctor@vcms.com',
        password: await hash('doctor123'),
        role: 'doctor',
        phone: '2001234581',
        specialization: 'Pulmonology',
        experience: 13,
        location: 'Bangalore',
        consultationFee: 480,
        profileImage: 'https://via.placeholder.com/150',
        availability: [
          { day: 'Monday', startTime: '09:00', endTime: '17:00' },
          { day: 'Wednesday', startTime: '09:00', endTime: '17:00' },
          { day: 'Thursday', startTime: '09:00', endTime: '17:00' },
        ],
        approvalStatus: 'approved',
        isActive: true,
      },
      {
        name: 'Paul Gupta',

        email: 'paul.doctor@vcms.com',
        password: await hash('doctor123'),
        role: 'doctor',
        phone: '2001234582',
        specialization: 'Nephrology',
        experience: 14,
        location: 'Hyderabad',
        consultationFee: 520,
        profileImage: 'https://via.placeholder.com/150',
        availability: [
          { day: 'Tuesday', startTime: '10:00', endTime: '18:00' },
          { day: 'Thursday', startTime: '10:00', endTime: '18:00' },
          { day: 'Friday', startTime: '10:00', endTime: '18:00' },
        ],
        approvalStatus: 'approved',
        isActive: true,
      },
      {
        name: 'Quinn Lee',
        email: 'quinn.doctor@vcms.com',
        password: await hash('doctor123'),
        role: 'doctor',
        phone: '2001234583',
        specialization: 'Infectious Disease',
        experience: 10,
        location: 'Chennai',
        consultationFee: 450,
        profileImage: 'https://via.placeholder.com/150',
        availability: [
          { day: 'Monday', startTime: '10:00', endTime: '18:00' },
          { day: 'Wednesday', startTime: '10:00', endTime: '18:00' },
          { day: 'Saturday', startTime: '09:00', endTime: '13:00' },
        ],
        approvalStatus: 'approved',
        isActive: true,
      },
      {
        name: 'Rachel White',

        email: 'rachel.doctor@vcms.com',
        password: await hash('doctor123'),
        role: 'doctor',
        phone: '2001234584',
        specialization: 'Physiotherapy',
        experience: 9,
        location: 'Pune',
        consultationFee: 350,
        profileImage: 'https://via.placeholder.com/150',
        availability: [
          { day: 'Monday', startTime: '09:00', endTime: '17:00' },
          { day: 'Tuesday', startTime: '09:00', endTime: '17:00' },
          { day: 'Wednesday', startTime: '09:00', endTime: '17:00' },
        ],
        approvalStatus: 'approved',
        isActive: true,
      },
      {
        name: 'Samuel Hart',

        email: 'samuel.doctor@vcms.com',
        password: await hash('doctor123'),
        role: 'doctor',
        phone: '2001234585',
        specialization: 'Nutrition',
        experience: 8,
        location: 'Mumbai',
        consultationFee: 300,
        profileImage: 'https://via.placeholder.com/150',
        availability: [
          { day: 'Tuesday', startTime: '10:00', endTime: '18:00' },
          { day: 'Thursday', startTime: '10:00', endTime: '18:00' },
          { day: 'Saturday', startTime: '09:00', endTime: '13:00' },
        ],
        approvalStatus: 'approved',
        isActive: true,
      },
      {
        name: 'Tara Iyer',

        email: 'tara.doctor@vcms.com',
        password: await hash('doctor123'),
        role: 'doctor',
        phone: '2001234586',
        specialization: 'Ayurveda',
        experience: 12,
        location: 'Delhi',
        consultationFee: 280,
        profileImage: 'https://via.placeholder.com/150',
        availability: [
          { day: 'Monday', startTime: '09:00', endTime: '17:00' },
          { day: 'Tuesday', startTime: '09:00', endTime: '17:00' },
          { day: 'Thursday', startTime: '09:00', endTime: '17:00' },
        ],
        approvalStatus: 'approved',
        isActive: true,
      },
      {
        name: 'Uma Reddy',
        email: 'uma.doctor@vcms.com',
        password: await hash('doctor123'),
        role: 'doctor',
        phone: '2001234587',
        specialization: 'General Medicine',
        experience: 7,
        location: 'Bangalore',
        consultationFee: 320,
        profileImage: 'https://via.placeholder.com/150',
        availability: [
          { day: 'Wednesday', startTime: '10:00', endTime: '18:00' },
          { day: 'Friday', startTime: '10:00', endTime: '18:00' },
          { day: 'Saturday', startTime: '09:00', endTime: '13:00' },
        ],
        approvalStatus: 'approved',
        isActive: true,
      },
    ]);
    console.log('✓ Sample doctors created with various specializations');

    // ensure every required specialization has at least one doctor in database
    const requiredSpecializations = [
      'Cardiology',
      'General Medicine',
      'Dermatology',
      'Orthopedics',
      'Neurology',
      'Gastroenterology',
      'Pediatrics',
      'Psychiatry',
      'Ophthalmology',
      'ENT',
      'Obstetrics & Gynecology',
      'Urology',
      'Oncology',
      'Infectious Disease',
      'Rheumatology',
      'Physiotherapy',
    ];
    const existingSpecs = new Set(doctors.map((d) => d.specialization));
    let placeholderCounter = 0;
    for (const spec of requiredSpecializations) {
      if (!existingSpecs.has(spec)) {
        console.log(`Adding placeholder doctor for missing specialization: ${spec}`);
        placeholderCounter += 1;
        // generate a unique phone number for each placeholder
        const phoneNum = `9999${String(100000 + placeholderCounter).slice(-6)}`; // e.g. 9999100000
        let placeholder;
        try {
          placeholder = await User.create({
            name: `${spec} Specialist`,
            email: `${spec.toLowerCase().replace(/\s+/g, '')}@vcms.com`,
            password: await hash('doctor123'),
            role: 'doctor',
            phone: phoneNum,
            specialization: spec,
            experience: 5,
            location: 'Unknown',
            consultationFee: 300,
            profileImage: 'https://via.placeholder.com/150',
            availability: randomAvailability(),
            approvalStatus: 'approved',
            isActive: true,
            isPublic: true, // mark as public immediately
          });
        } catch (err) {
          // if duplicate key error occurs, log and continue
          console.warn(`placeholder for ${spec} failed:`, err.message);
          continue;
        }
        // also add to doctors array so later loop can mark profile fields
        if (placeholder) doctors.push(placeholder);
      }
    }

    // ✅ NEW: Create public doctor profiles (for guest browsing)
    // Mark created doctors as public profiles (merge PublicDoctor fields into User)
    console.log('Marking created doctors as public profiles...');
    for (const doc of doctors) {
      await User.findByIdAndUpdate(doc._id, {
        isPublic: true,
        displayName: doc.name,
        city: doc.location,
        location: doc.location,
        rating: 4.5,
        reviewCount: 0,
        expertise_symptoms: [],
        languages: ['English', 'Hindi'],
        bio: `Experienced ${doc.specialization} specialist with ${doc.experience} years of practice.`,
      });
    }
    console.log('✓ 20 Users marked as public doctor profiles');

    console.log('Creating patients...');
    
    // Helper function to calculate age
    const calculateAge = (dateOfBirth) => {
      const today = new Date();
      const birthDate = new Date(dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0) age--;
      return age;
    };
    
    const patients = await User.create([
      {
        name: 'John Doe',
        email: 'john@patient.com',
        password: await hash('patient123'),
        role: 'patient',
        phone: '3001234567',
        dateOfBirth: new Date('1990-05-15'),
        age: calculateAge(new Date('1990-05-15')),
        gender: 'male',
        profileImage: 'https://via.placeholder.com/150',
        approvalStatus: 'approved',
        isActive: true,
      },
      {
        name: 'Sarah Williams',
        email: 'sarah@patient.com',
        password: await hash('patient123'),
        role: 'patient',
        phone: '3001234568',
        dateOfBirth: new Date('1992-08-22'),
        age: calculateAge(new Date('1992-08-22')),
        gender: 'female',
        profileImage: 'https://via.placeholder.com/150',
        approvalStatus: 'approved',
        isActive: true,
      },
      {
        name: 'Michael Brown',
        email: 'michael@patient.com',
        password: await hash('patient123'),
        role: 'patient',
        phone: '3001234569',
        dateOfBirth: new Date('1988-03-10'),
        age: calculateAge(new Date('1988-03-10')),
        gender: 'male',
        profileImage: 'https://via.placeholder.com/150',
        approvalStatus: 'approved',
        isActive: true,
      },
      {
        name: 'Emily Johnson',
        email: 'emily@patient.com',
        password: await hash('patient123'),
        role: 'patient',
        phone: '3001234570',
        dateOfBirth: new Date('1995-11-30'),
        age: calculateAge(new Date('1995-11-30')),
        gender: 'female',
        profileImage: 'https://via.placeholder.com/150',
        approvalStatus: 'approved',
        isActive: true,
      },
      {
        name: 'David Wilson',
        email: 'david@patient.com',
        password: await hash('patient123'),
        role: 'patient',
        phone: '3001234571',
        dateOfBirth: new Date('1987-07-18'),
        age: calculateAge(new Date('1987-07-18')),
        gender: 'male',
        profileImage: 'https://via.placeholder.com/150',
        approvalStatus: 'approved',
        isActive: true,
      },
    ]);
    console.log('✓ 5 Patients created');

    console.log('Creating appointments...');
    const appointments = await Appointment.create([
      {
        patientId: patients[0]._id,
        doctorId: doctors[0]._id,
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        time: '09:00',
        status: 'pending',
        type: 'video',
        symptoms: 'Chest pain',
        roomId: uuidv4(),
      },
      {
        patientId: patients[1]._id,
        doctorId: doctors[1]._id,
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        time: '11:00',
        status: 'confirmed',
        type: 'video',
        symptoms: 'Fever and cough',
        roomId: uuidv4(),
      },
      {
        patientId: patients[2]._id,
        doctorId: doctors[0]._id,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        time: '10:00',
        status: 'completed',
        type: 'video',
        symptoms: 'Heart palpitations',
        roomId: uuidv4(),
      },
      {
        patientId: patients[3]._id,
        doctorId: doctors[2]._id,
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        time: '14:00',
        status: 'pending',
        type: 'in-person',
        symptoms: 'Skin rash',
        roomId: null,
      },
      {
        patientId: patients[4]._id,
        doctorId: doctors[1]._id,
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        time: '15:00',
        status: 'completed',
        type: 'video',
        symptoms: 'General checkup',
        roomId: uuidv4(),
      },
      {
        patientId: patients[0]._id,
        doctorId: doctors[1]._id,
        date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        time: '13:00',
        status: 'cancelled',
        type: 'video',
        symptoms: 'Headache',
        roomId: null,
      },
      {
        patientId: patients[1]._id,
        doctorId: doctors[2]._id,
        date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        time: '10:00',
        status: 'pending',
        type: 'in-person',
        symptoms: 'Skin allergy',
        roomId: null,
      },
      {
        patientId: patients[2]._id,
        doctorId: doctors[2]._id,
        date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        time: '11:00',
        status: 'pending',
        type: 'video',
        symptoms: 'Follow-up visit',
        roomId: uuidv4(),
      },
      {
        patientId: patients[3]._id,
        doctorId: doctors[0]._id,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        time: '09:00',
        status: 'completed',
        type: 'video',
        symptoms: 'Cardiac assessment',
        roomId: uuidv4(),
      },
      {
        patientId: patients[4]._id,
        doctorId: doctors[2]._id,
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        time: '15:00',
        status: 'pending',
        type: 'in-person',
        symptoms: 'Routine checkup',
        roomId: null,
      },
    ]);
    console.log('✓ 10 Appointments created');

    console.log('Creating prescriptions...');
    // Only create prescriptions for completed appointments
    const completedAppointments = appointments.filter(a => a.status === 'completed');
    const prescriptions = await Prescription.create([
      {
        appointmentId: completedAppointments[0]._id,
        patientId: completedAppointments[0].patientId,
        doctorId: completedAppointments[0].doctorId,
        medications: [
          { name: 'Aspirin', dosage: '100mg', frequency: 'Once daily', duration: '30 days' },
          { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', duration: '30 days' },
        ],
        diagnosis: 'Hypertension with chest discomfort',
        notes: 'Follow up after 2 weeks',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        appointmentId: completedAppointments[1]._id,
        patientId: completedAppointments[1].patientId,
        doctorId: completedAppointments[1].doctorId,
        medications: [
          { name: 'Paracetamol', dosage: '500mg', frequency: 'Twice daily', duration: '5 days' },
          { name: 'Cough Syrup', dosage: '10ml', frequency: 'Three times daily', duration: '7 days' },
        ],
        diagnosis: 'Common cold with cough',
        notes: 'Stay hydrated and rest',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        appointmentId: completedAppointments[2]._id,
        patientId: completedAppointments[2].patientId,
        doctorId: completedAppointments[2].doctorId,
        medications: [
          { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', duration: '60 days' },
        ],
        diagnosis: 'Type 2 Diabetes',
        notes: 'Monitor blood sugar levels daily',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    ]);
    console.log('✓ 5 Prescriptions created');

    console.log('Creating medical history...');
    const medicalHistories = await MedicalHistory.create([
      {
        patientId: patients[0]._id,
        doctorId: doctors[0]._id,
        condition: 'Hypertension',
        description: 'High blood pressure, currently on medication',
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        patientId: patients[1]._id,
        doctorId: doctors[1]._id,
        condition: 'Asthma',
        description: 'Mild asthma, controlled with inhaler',
        date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      },
      {
        patientId: patients[2]._id,
        doctorId: doctors[0]._id,
        condition: 'Allergic Rhinitis',
        description: 'Seasonal allergies',
        date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      },
      {
        patientId: patients[3]._id,
        doctorId: doctors[2]._id,
        condition: 'Eczema',
        description: 'Chronic skin condition',
        date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      },
      {
        patientId: patients[4]._id,
        doctorId: doctors[1]._id,
        condition: 'Type 2 Diabetes',
        description: 'Controlled with diet and medication',
        date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
      },
    ]);
    console.log('✓ Medical histories created');

    console.log('Creating notifications...');
    const notifications = await Notification.create([
      {
        userId: doctors[0]._id,
        title: 'New Appointment Request',
        message: 'New appointment request from John Doe',
        type: 'appointment',
        isRead: false,
      },
      {
        userId: patients[0]._id,
        title: 'Appointment Confirmed',
        message: 'Your appointment with Dr. Alice Johnson is confirmed',
        type: 'appointment',
        isRead: false,
      },
      {
        userId: patients[2]._id,
        title: 'Prescription Available',
        message: 'Your prescription is ready',
        type: 'prescription',
        isRead: true,
      },
      {
        userId: doctors[1]._id,
        title: 'System Notification',
        message: 'You have a scheduled appointment tomorrow',
        type: 'system',
        isRead: false,
      },
      {
        userId: admin._id,
        title: 'Daily Report',
        message: '5 new appointments today',
        type: 'system',
        isRead: false,
      },
    ]);
    console.log('✓ Notifications created');

    console.log('\n✅ Database seeded successfully!');
    console.log('\nTest Credentials:');
    console.log('Admin: admin@gmail.com / 12345');
    console.log('Doctor: alice.doctor@vcms.com / doctor123');
    console.log('Patient: john@patient.com / patient123');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err);    process.exit(1);
  }
};

seed();