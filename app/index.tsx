import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  CollectionReference,
} from 'firebase/firestore';
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SalaryCalculation } from '../types/salary';

import db from '~/utils/firebase';

export default function Home() {
  const [hours, setHours] = useState<string>('');
  const [rate, setRate] = useState<string>('');
  const [salary, setSalary] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [recentCalculations, setRecentCalculations] = useState<SalaryCalculation[]>([]);

  const saveCalculation = async (
    calculationData: Omit<SalaryCalculation, 'id' | 'timestamp'>
  ): Promise<void> => {
    try {
      const salaryCollection = collection(
        db,
        'salary_calculations'
      ) as CollectionReference<SalaryCalculation>;

      const docRef = await addDoc(salaryCollection, {
        hours: calculationData.hours,
        rate: calculationData.rate,
        totalSalary: calculationData.totalSalary,
        timestamp: new Date().toISOString(),
      });

      console.log('Calculation saved with ID: ', docRef.id);
    } catch (error) {
      console.error('Error saving calculation: ', error);
      Alert.alert('Error', 'Failed to save calculation');
    }
  };

  const fetchRecentCalculations = async (): Promise<void> => {
    try {
      const salaryCollection = collection(
        db,
        'salary_calculations'
      ) as CollectionReference<SalaryCalculation>;

      const q = query(salaryCollection, orderBy('timestamp', 'desc'), limit(5));

      const querySnapshot = await getDocs(q);
      const calculations: SalaryCalculation[] = [];

      querySnapshot.forEach((doc) => {
        calculations.push({ id: doc.id, ...doc.data() });
      });

      setRecentCalculations(calculations);
    } catch (error) {
      console.error('Error fetching calculations: ', error);
    }
  };

  const calculateSalary = async (): Promise<void> => {
    setLoading(true);
    const hoursWorked = parseFloat(hours);
    const hourlyRate = parseFloat(rate);

    if (isNaN(hoursWorked) || isNaN(hourlyRate)) {
      Alert.alert('Error', 'Please enter valid numbers');
      setLoading(false);
      return;
    }

    let totalSalary = 0;
    if (hoursWorked > 40) {
      const regularHours = 40;
      const overtimeHours = hoursWorked - 40;
      const overtimeRate = hourlyRate * 1.5;

      totalSalary = regularHours * hourlyRate + overtimeHours * overtimeRate;
    } else {
      totalSalary = hoursWorked * hourlyRate;
    }

    setSalary(totalSalary);

    await saveCalculation({
      hours: hoursWorked,
      rate: hourlyRate,
      totalSalary,
    });

    await fetchRecentCalculations();
    setLoading(false);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="p-4">
        <Text className="mb-6 text-2xl font-bold">Salary Calculator</Text>

        <View className="space-y-4">
          <View>
            <Text className="mb-2 text-gray-600">Working Hours per Week</Text>
            <TextInput
              className="rounded-lg border border-gray-300 p-3"
              keyboardType="numeric"
              value={hours}
              onChangeText={setHours}
              placeholder="Enter working hours"
            />
          </View>

          <View className="mb-2">
            <Text className="mb-2 text-gray-600">Rate per Hour</Text>
            <TextInput
              className="rounded-lg border border-gray-300 p-3"
              keyboardType="numeric"
              value={rate}
              onChangeText={setRate}
              placeholder="Enter hourly rate"
            />
          </View>

          <TouchableOpacity
            className="rounded-lg bg-blue-500 p-4"
            onPress={calculateSalary}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-center font-bold text-white">Calculate Salary</Text>
            )}
          </TouchableOpacity>

          {salary > 0 && (
            <View className="mt-4 rounded-lg bg-gray-100 p-4">
              <Text className="text-center text-lg font-bold">
                Total Salary: ${salary.toFixed(2)}
              </Text>
            </View>
          )}

          {recentCalculations.length > 0 && (
            <View className="mt-6">
              <Text className="mb-3 text-xl font-bold">Recent Calculations</Text>
              {recentCalculations.map((calc) => (
                <View
                  key={calc.id}
                  className="mb-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <Text>Hours: {calc.hours}</Text>
                  <Text>Rate: ${calc.rate}/hr</Text>
                  <Text className="font-bold">Total: ${calc.totalSalary.toFixed(2)}</Text>
                  <Text className="text-xs text-gray-500">{formatDate(calc.timestamp)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
