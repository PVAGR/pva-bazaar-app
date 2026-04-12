import React from 'react'
import GovernanceInterface from '../components/governance'
import '../styles/governance.css'

export function GovernanceConferencePage() {
  return <GovernanceInterface initialPage="conference" />
}

export function GovernanceTreasuryPage() {
  return <GovernanceInterface initialPage="treasury" />
}

export default function OtherPages() {
  return <GovernanceInterface initialPage="conference" />
}
