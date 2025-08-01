#!/usr/bin/env python3
"""
Groq Rate Limit Monitor and Management Utility

This script provides utilities for monitoring and managing Groq API rate limits
without running the full event extraction pipeline.
"""

import sys
import json
from ai import EventExtractor
from datetime import datetime


def print_usage_stats(extractor):
    """Print detailed usage statistics."""
    stats = extractor.get_rate_limit_stats()
    
    print("📊 Current Groq API Usage Statistics")
    print("=" * 50)
    
    # RPM stats
    rpm = stats['requests_per_minute']
    print(f"Requests Per Minute:")
    print(f"  Current: {rpm['current']}")
    print(f"  Threshold (90%): {rpm['threshold']}")
    print(f"  Official Limit: {rpm['limit']}")
    print(f"  Usage: {rpm['percentage']:.1f}%")
    
    if rpm['percentage'] > 80:
        print(f"  ⚠️  WARNING: Usage above 80%")
    elif rpm['percentage'] > 60:
        print(f"  🟡 CAUTION: Usage above 60%")
    else:
        print(f"  ✅ SAFE: Usage below 60%")
    
    print()
    
    # RPD stats
    rpd = stats['requests_per_day']
    print(f"Requests Per Day:")
    print(f"  Current: {rpd['current']}")
    print(f"  Threshold (90%): {rpd['threshold']}")
    print(f"  Official Limit: {rpd['limit']}")
    print(f"  Usage: {rpd['percentage']:.1f}%")
    
    if rpd['percentage'] > 80:
        print(f"  ⚠️  WARNING: Usage above 80%")
    elif rpd['percentage'] > 60:
        print(f"  🟡 CAUTION: Usage above 60%")
    else:
        print(f"  ✅ SAFE: Usage below 60%")
    
    print()
    
    # TPM stats
    tpm = stats['tokens_per_minute']
    print(f"Tokens Per Minute:")
    print(f"  Current: {tpm['current']}")
    print(f"  Threshold (90%): {tpm['threshold']}")
    print(f"  Official Limit: {tpm['limit']}")
    print(f"  Usage: {tpm['percentage']:.1f}%")
    
    if tpm['percentage'] > 80:
        print(f"  ⚠️  WARNING: Usage above 80%")
    elif tpm['percentage'] > 60:
        print(f"  🟡 CAUTION: Usage above 60%")
    else:
        print(f"  ✅ SAFE: Usage below 60%")
    
    print()
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


def update_limits_interactive(extractor):
    """Interactive interface for updating rate limits."""
    print("🔧 Update Groq API Rate Limits")
    print("=" * 50)
    print("Current limits:")
    stats = extractor.get_rate_limit_stats()
    print(f"  RPM: {stats['requests_per_minute']['limit']}")
    print(f"  RPD: {stats['requests_per_day']['limit']}")
    print(f"  TPM: {stats['tokens_per_minute']['limit']}")
    print()
    
    print("Enter new limits (press Enter to keep current value):")
    
    # RPM
    try:
        rpm_input = input(f"Requests Per Minute (current: {stats['requests_per_minute']['limit']}): ").strip()
        new_rpm = int(rpm_input) if rpm_input else None
    except ValueError:
        print("Invalid RPM value, keeping current")
        new_rpm = None
    
    # RPD
    try:
        rpd_input = input(f"Requests Per Day (current: {stats['requests_per_day']['limit']}): ").strip()
        new_rpd = int(rpd_input) if rpd_input else None
    except ValueError:
        print("Invalid RPD value, keeping current")
        new_rpd = None
    
    # TPM
    try:
        tpm_input = input(f"Tokens Per Minute (current: {stats['tokens_per_minute']['limit']}): ").strip()
        new_tpm = int(tpm_input) if tpm_input else None
    except ValueError:
        print("Invalid TPM value, keeping current")
        new_tpm = None
    
    if any([new_rpm, new_rpd, new_tpm]):
        extractor.update_rate_limits(new_rpm, new_rpd, new_tpm)
        print("✅ Rate limits updated successfully!")
        print_usage_stats(extractor)
    else:
        print("No changes made.")


def export_stats(extractor, filename=None):
    """Export current statistics to JSON file."""
    stats = extractor.get_rate_limit_stats()
    stats['timestamp'] = datetime.now().isoformat()
    
    if not filename:
        filename = f"groq_rate_limits_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    with open(filename, 'w') as f:
        json.dump(stats, f, indent=2)
    
    print(f"📁 Statistics exported to: {filename}")


def main():
    """Main function for rate limit monitoring utility."""
    if len(sys.argv) < 2:
        print("Groq Rate Limit Monitor and Management Utility")
        print("=" * 50)
        print("Usage:")
        print("  python rate_limit_monitor.py stats        - Show current usage statistics")
        print("  python rate_limit_monitor.py update       - Update rate limits interactively")
        print("  python rate_limit_monitor.py export [file] - Export stats to JSON file")
        print("  python rate_limit_monitor.py reset        - Reset usage tracking (use with caution)")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    try:
        extractor = EventExtractor()
        
        if command == "stats":
            print_usage_stats(extractor)
        
        elif command == "update":
            update_limits_interactive(extractor)
        
        elif command == "export":
            filename = sys.argv[2] if len(sys.argv) > 2 else None
            export_stats(extractor, filename)
        
        elif command == "reset":
            confirm = input("⚠️  Are you sure you want to reset all usage tracking? This cannot be undone. (yes/no): ")
            if confirm.lower() == "yes":
                extractor.reset_rate_limit_tracking()
                print("✅ Usage tracking reset.")
            else:
                print("Reset cancelled.")
        
        else:
            print(f"❌ Unknown command: {command}")
            print("Use 'stats', 'update', 'export', or 'reset'")
            sys.exit(1)
    
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
